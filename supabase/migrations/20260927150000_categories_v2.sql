-- The Category list changed: AI and IT merge into AI/IT, four names change, and Items of the two
-- Categories that are gone (Pomysły na produkty, Ceramika) fall back to Inne.
update items set category = 'AI/IT' where category in ('AI', 'IT');
update items set category = 'Elektronika' where category = 'Produkty';
update items set category = 'Sport' where category = 'Siłownia';
update items set category = 'Kuchnia' where category = 'Jedzenie';
update items set category = 'Inne' where category in ('Pomysły na produkty', 'Ceramika');
