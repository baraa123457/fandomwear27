-- Add WhatsApp support phone to store_settings table
alter table public.store_settings
  add column if not exists whatsapp_phone text default '+20 100 000 0000';

notify pgrst, 'reload schema';
