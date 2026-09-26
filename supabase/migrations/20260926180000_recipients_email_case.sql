-- One mailbox, one Recipient, whatever the spelling: the Panel stores addresses lower-cased, and this
-- index catches rows that were added by SQL before the Panel existed.
create unique index recipients_email_lower_idx on recipients (lower(email));
