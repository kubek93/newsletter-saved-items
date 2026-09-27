#!/usr/bin/env python3
"""Builds and signs the three Apple Shortcuts that share things with Nuska from the iOS share sheet.

    python3 shortcuts/build.py [--base https://www.nuska.pl] [--out ~/Downloads] [--env .env]

Reads INGEST_TOKEN from the environment or from .env at the repo root, writes the signed files into
shortcuts/ (ignored by git: they embed the token) and into --out. Needs macOS: signing uses the
`shortcuts` command. Only actions that proved to work on the Owner's device are used: no If,
no Repeat-independent variables, no Resize Image, no Date; see the notes at the bottom.
"""
import argparse, os, plistlib, re, shutil, subprocess, sys, uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.dirname(os.path.abspath(__file__))
OBJ = "￼"  # the object-replacement character Shortcuts uses for a variable inside text


def ingest_token(env_file: str) -> str:
    token = os.environ.get("INGEST_TOKEN")
    if not token and os.path.exists(env_file):
        match = re.search(r"^INGEST_TOKEN=(.*)$", open(env_file).read(), re.M)
        token = match.group(1).strip() if match else None
    if not token:
        sys.exit(f"INGEST_TOKEN is not set and not in {env_file}")
    return token


# --- plist building blocks
def uid() -> str:
    return str(uuid.uuid4()).upper()

def plain(text: str) -> dict:
    return {"Value": {"string": text, "attachmentsByRange": {}}, "WFSerializationType": "WFTextTokenString"}

def only(ref: dict) -> dict:
    """A text made of one variable."""
    return {"Value": {"string": OBJ, "attachmentsByRange": {"{0, 1}": ref}}, "WFSerializationType": "WFTextTokenString"}

def att(ref: dict) -> dict:
    return {"Value": ref, "WFSerializationType": "WFTextTokenAttachment"}

def out(action_uuid: str, name: str) -> dict:
    return {"Type": "ActionOutput", "OutputUUID": action_uuid, "OutputName": name}

EXT_INPUT = {"Type": "ExtensionInput"}
REPEAT_ITEM = {"Type": "Variable", "VariableName": "Repeat Item"}

def dictionary(items: list[tuple[str, dict]]) -> dict:
    return {"Value": {"WFDictionaryFieldValueItems": [{"WFItemType": 0, "WFKey": plain(k), "WFValue": v} for k, v in items]},
            "WFSerializationType": "WFDictionaryFieldValue"}

def action(identifier: str, **params) -> dict:
    return {"WFWorkflowActionIdentifier": f"is.workflow.actions.{identifier}", "WFWorkflowActionParameters": params}

def request(u: str, url, method: str, headers: list[tuple[str, str]], body=None, file_ref=None) -> dict:
    params = {"UUID": u, "WFHTTPMethod": method, "WFURL": url, "ShowHeaders": True,
              "WFHTTPHeaders": dictionary([(k, plain(v)) for k, v in headers])}
    if body is not None:
        params["WFHTTPBodyType"] = "JSON"
        params["WFJSONValues"] = dictionary(body)
    if file_ref is not None:
        params["WFHTTPBodyType"] = "File"
        params["WFRequestVariable"] = att(file_ref)
    return action("downloadurl", **params)

def get_value(u: str, key: str, source: dict) -> dict:
    return action("getvalueforkey", UUID=u, WFDictionaryKey=key, WFGetDictionaryValueType="Value", WFInput=att(source))

def notify(title: str, body: str) -> dict:
    return action("notification", WFNotificationActionTitle=title, WFNotificationActionBody=body)

def workflow(actions: list[dict], input_classes: list[str], glyph: int, color: int) -> dict:
    return {
        "WFWorkflowClientVersion": "2607",
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowHasShortcutInputVariables": True,
        "WFWorkflowIcon": {"WFWorkflowIconGlyphNumber": glyph, "WFWorkflowIconStartColor": color},
        "WFWorkflowImportQuestions": [],
        "WFWorkflowInputContentItemClasses": input_classes,
        "WFWorkflowNoInputBehavior": {"Name": "WFWorkflowNoInputBehaviorGetClipboard"},
        "WFWorkflowTypes": ["ActionExtension"],
        "WFWorkflowActions": actions,
    }


# --- the three Shortcuts
def link_shortcut(base: str, auth: list[tuple[str, str]]) -> dict:
    """The shared link goes straight into the body; the server takes the first URL out of whatever text it gets."""
    u_post = uid()
    return workflow([
        request(u_post, f"{base}/api/ingest/link", "POST", auth, body=[("url", only(EXT_INPUT))]),
        notify("Nuska", "Link wysłany do zapisania. Wpis pojawi się w Panelu po analizie."),
    ], ["WFURLContentItem", "WFSafariWebPageContentItem", "WFStringContentItem"], 59511, 4282601983)


def photo_shortcut(base: str, auth: list[tuple[str, str]]) -> dict:
    """Every photo of the share: JPEG at quality 0.7, upload, register under the share's batch key; then done."""
    u_batch, u_convert, u_name, u_url, u_upload_url, u_path, u_put, u_register, u_done = (uid() for _ in range(9))
    group = uid()
    batch = out(u_batch, "Name")  # several photos give their names joined: one key per share
    put = request(u_put, "", "PUT", [("Content-Type", "image/jpeg")], file_ref=out(u_convert, "Converted Image"))
    put["WFWorkflowActionParameters"]["WFURL"] = only(out(u_upload_url, "Dictionary Value"))
    return workflow([
        action("getitemname", UUID=u_batch, WFInput=att(EXT_INPUT)),
        action("repeat.each", GroupingIdentifier=group, WFControlFlowMode=0, WFInput=att(EXT_INPUT)),
        action("image.convert", UUID=u_convert, WFImageFormat="JPEG", WFImageCompressionQuality=0.7, WFImagePreserveMetadata=False, WFInput=att(REPEAT_ITEM)),
        action("getitemname", UUID=u_name, WFInput=att(REPEAT_ITEM)),
        request(u_url, f"{base}/api/ingest/upload-url", "POST", auth, body=[("filename", only(out(u_name, "Name"))), ("mimeType", plain("image/jpeg"))]),
        get_value(u_upload_url, "uploadUrl", out(u_url, "Contents of URL")),
        get_value(u_path, "path", out(u_url, "Contents of URL")),
        put,
        request(u_register, f"{base}/api/ingest/upload", "POST", auth, body=[("path", only(out(u_path, "Dictionary Value"))), ("batch", only(batch))]),
        action("repeat.each", GroupingIdentifier=group, WFControlFlowMode=2),
        request(u_done, f"{base}/api/ingest/upload/done", "POST", auth, body=[("batch", only(batch))]),
        notify("Nuska", "Zdjęcia wysłane. Wpis pojawi się w Panelu po analizie."),
    ], ["WFImageContentItem"], 59446, 4292093695)


def video_shortcut(base: str, auth: list[tuple[str, str]]) -> dict:
    """One video as shared (an iPhone records .mov): upload, register, notify."""
    u_name, u_url, u_upload_url, u_path, u_put, u_register = (uid() for _ in range(6))
    put = request(u_put, "", "PUT", [("Content-Type", "video/quicktime")], file_ref=EXT_INPUT)
    put["WFWorkflowActionParameters"]["WFURL"] = only(out(u_upload_url, "Dictionary Value"))
    return workflow([
        action("getitemname", UUID=u_name, WFInput=att(EXT_INPUT)),
        request(u_url, f"{base}/api/ingest/upload-url", "POST", auth, body=[("filename", only(out(u_name, "Name"))), ("mimeType", plain("video/quicktime"))]),
        get_value(u_upload_url, "uploadUrl", out(u_url, "Contents of URL")),
        get_value(u_path, "path", out(u_url, "Contents of URL")),
        put,
        request(u_register, f"{base}/api/ingest/upload", "POST", auth, body=[("path", only(out(u_path, "Dictionary Value")))]),
        notify("Nuska", "Wideo wysłane. Wpis pojawi się w Panelu po analizie."),
    ], ["WFAVAssetContentItem"], 59446, 4274264319)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base", default=os.environ.get("NUSKA_BASE", "https://www.nuska.pl"), help="where the API lives")
    parser.add_argument("--out", default=os.path.expanduser("~/Downloads"), help="a second copy of the signed files goes here")
    parser.add_argument("--env", default=os.path.join(ROOT, ".env"), help="the .env file to read INGEST_TOKEN from")
    args = parser.parse_args()
    auth = [("Authorization", f"Bearer {ingest_token(args.env)}")]

    for name, build in [("Nuska Zapisz link", link_shortcut), ("Nuska Zapisz zdjęcie", photo_shortcut), ("Nuska Zapisz wideo", video_shortcut)]:
        unsigned = os.path.join(HERE, f"{name}.unsigned.shortcut")
        signed = os.path.join(HERE, f"{name}.shortcut")
        with open(unsigned, "wb") as f:
            plistlib.dump(build(args.base, auth), f)
        subprocess.run(["shortcuts", "sign", "--mode", "anyone", "--input", unsigned, "--output", signed], check=True)
        os.remove(unsigned)
        if args.out:
            os.makedirs(args.out, exist_ok=True)
            shutil.copy(signed, os.path.join(args.out, f"{name}.shortcut"))
        print(f"{signed} ({os.path.getsize(signed)} bytes)")


# Notes from the Owner's device (iOS, 2026-09-27), which shaped these workflows:
# - "If" ends with "Please choose a value for each parameter"; Text with several variables, Resize Image
#   and Date / Format Date give empty output. Get Name, Convert Image, Get Dictionary Value, Replace Text
#   (plain), Get Contents of URL and Repeat with Each work, also inside the loop.
# - "Get URLs from Input" gives an empty list, so the link Shortcut sends the raw input and the server
#   picks the first http(s) URL out of it.
# - A JSON body value that is one variable is sent as that variable's text.
if __name__ == "__main__":
    main()
