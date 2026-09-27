# Newsletter Saved Items

A personal tool that collects things the Owner saves during the day (X bookmarks, Instagram posts, web links, photos, videos), describes each one with AI, and emails a daily summary.

## Language

**Item**:
One saved thing: an X post, an Instagram post, a web link, a photo or a video. Has exactly one Source, one Category and, once analysed, one Summary.
_Avoid_: element, entry, post, saved item, wpis

**Source**:
Where an Item came from. One of: X, Instagram, YouTube, Facebook, Allegro, Amazon, Web (any other shared link), Upload (a photo or video from the Owner's device). Told apart by the link's host; a Source says where the link came from, not how it is read. Every Source reaches the system the same way: shared by the Owner from the Share Sheet.
_Avoid_: origin, platform, channel, kanał

**Summary**:
The AI-generated detailed description of an Item's content plus a short recap, always written in Polish regardless of the source language. One Summary per Item; until it exists the Item is Pending.
_Avoid_: description, analysis, caption, opis

**Pending**:
The state of an Item from the moment it is saved until its Summary exists. A Pending Item is already visible in the Panel.
_Avoid_: processing, queued, in progress, oczekujący

**Category**:
One label from a closed list defined by the Owner: AI/IT, Elektronika, Zdrowie, Sport, Kuchnia, Polityka, Finanse, Motoryzacja, Memy, Inne. "Inne" is the catch-all for anything that fits none of the others. The AI assigns it to an Item; the Owner may change it in the Panel. An Item has exactly one Category.
_Avoid_: tag, label, topic, group, temat

**Digest**:
The daily email containing the Summaries of all Items saved in the Digest Day that just ended, grouped by Category, sent at 07:00 Europe/Warsaw to every Recipient with identical content. It is sent even when the Digest Day had no Items, as an empty Digest. A Failed Item is listed with its link and a note that it could not be read.
_Avoid_: newsletter, daily report, mail, podsumowanie dnia

**Digest Day**:
The 24 hours from 03:00 to 03:00 Europe/Warsaw. Items saved after midnight but before 03:00 belong to the day that is ending, because the Owner often saves things late at night.
_Avoid_: calendar day, doba, previous day

**Failed**:
The state of an Item whose Summary could not be produced (unreadable source, model error). A Failed Item still appears in the Digest and is retried once a day until three attempts in total have been made.
_Avoid_: error, broken, unprocessed, błąd

**Recipient**:
An email address that receives the Digest. A Recipient has no account and never logs into the Panel.
_Avoid_: subscriber, user, odbiorca

**Panel**:
The web application where the Owner browses all Items and manages the Recipient list. Its UI is in Polish.
_Avoid_: dashboard, admin, app

**Owner**:
The single person who logs into the Panel (via Google). Owns the tool and is the sender of the Digest.
_Avoid_: user, admin, użytkownik
