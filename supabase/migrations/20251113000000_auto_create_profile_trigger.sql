--
-- migration: auto create profile on user signup
-- purpose: automatically create a profile record when a new user signs up
--          this ensures every user has a profile without relying on application code
--

-- funkcja która tworzy profil dla nowego użytkownika
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, language_code, theme)
  values (
    new.id,
    'pl',
    'light'
  );
  return new;
end;
$$ language plpgsql security definer;

-- trigger który wywołuje funkcję po utworzeniu użytkownika
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- komentarz: trigger działa z uprawnieniami security definer (bypasuje RLS)
-- dzięki temu profil jest tworzony nawet gdy sesja użytkownika nie jest jeszcze aktywna
comment on function public.handle_new_user() is 
  'Automatically creates a profile with default preferences when a new user signs up';

