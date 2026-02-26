# Инструкции за инсталация и стартиране на проекта

## Нужен софтуер и инструменти
- [Git](https://git-scm.com/install/) - за клониране на проекта
- [Node.js](https://nodejs.org/en/download) - за javascript runtime
- Кодов/текстов редактор по Ваш избор (препоръчителен софтуер - [Visiual Studio Code](https://code.visualstudio.com/download))

## Инсталация
1. Копирайте проекта от физическия носител (флаш памет/CD или др.) на вашия компютър или клонирайте директорно git хранилището чрез следната комада:
  
    ```bash
    git clone https://github.com/GeorgievIliyan/Recyclix.git
    ```
    * *главната директория е `recyclix/` или `Recyclix/` в зависимост от подхода на инсталация*
2. Отворете главната папка на проекта и стартирайте терминал (CMD) в нея
3. В отворения терминал изпълнете следната команда:
    ```bash
    npm install
    ```
## Настройване

1. **Конфигуриране на променливите на средата**:  
В главната директория ще откриете файл с име `.env.example`. Той съдържа ключовете, чрез които приложението комуникира с външните услуги.
Отчасти е попълнен със стойности, които няма нужда да бъдат променяни.  **Преименувайте го на `.env`**
  
    **Попълнете липсващите стойности, както следва:**

    1. **Google OAuth (Автентикация)**: 
    Тези ключове са необходими, за да работят функциите за вход чрез Google:

        - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET`:  
          
            Влезте в [Google Cloud Console](https://console.cloud.google.com/), създайте нов проект или изберете съществуващ. Отидете на `APIs & Services` > `Credentials`, изберете `Create Credentials` > `Auth Client ID`. Конфигурирайте като `Web Application` и копирайте получените `ID` и `Secret`.

    2. **Supabase API Ключове**:  
        2.1. Създайте си акаунт в [Supabase](https://supabase.com/)  
        2.2. Създайте проект в Supabase  
        2.3. Отидете в таблото за управление на вашия проект в Supabase:

        - `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`:   
        Ще ги намерите в `Project Settings` > `API`.

        - `SUPABASE_SERVICE_KEY`:  
        Намира се на същото място (`API`), но внимавайте да не го споделяте публично, защото дава административен достъп.

    3. **Връзка с Базата данни (PostgreSQL)**:
        - `DB_USERNAME` и `DB_PASSWORD`:  
        Използвайте потребителското име и паролата, които сте задали при самото създаване на проекта в `Supabase`. Можете да проверите настройките в `Project Settings` > `Database`.

    4. **Jawg Maps (Карти)**:  
        - `NEXT_PUBLIC_JAWG_KEY`:
        Посетете [Jawg.io](https://www.jawg.io/en/), регистрирайте се и генерирайте нов `Access Token` от секцията в страничното меню. Копирайте го и го поставете в `.env` файла.

    Ето как трябва да изглежда вашия `.env` файл накрая:
    ```ts
    NEXT_PUBLIC_GOOGLE_CLIENT_ID = 
    GOOGLE_CLIENT_SECRET = 
    GEMINI_API_KEY = 
    SECURE_API_KEY=75bb0888f4cb57a022496a9cc12f2843d04df4e87382508b88bb00aaba227e56f6ca92ac2591258ef54874ee731059a5eb13e2049b397a18efd2071cd237dbd6
    NEXTAUTH_SECRET=75bb0888f4cb57a022496a9cc12f2843d04df4e87382508b88bb00aaba227e56f6ca92ac2591258ef54874ee731059a5eb13e2049b397a18efd2071cd237dbd6
    NEXT_URL=http://localhost:3000
    NEXT_PUBLIC_SECURE_API_KEY = 545587b9bf19a832405253af77d7f631096063b45cc63ad08373cc0e041c066419bf886897229a378505b9678cf9ffc2222ad6dc9fdf45667eae06ebdb104da4
    NEXT_PUBLIC_SUPABASE_URL = 
    NEXT_PUBLIC_SUPABASE_ANON_KEY = 
    SUPABASE_SERVICE_KEY = 
    UPSTASH_REDIS_REST_URL=
    UPSTASH_REDIS_REST_TOKEN=
    DB_USERNAME = 
    DB_PASSWORD = 
    NODE_ENV = development
    NEXT_PUBLIC_JAWG_KEY = 
    ```

2. **Настройка на Supabase Dashboard**  
    След като попълните .env файла, трябва да подготвите самата база данни и облачното хранилище:

    1. **Упълномощаване на URL адреси**:  
    За да може Supabase да пренасочва потребителите обратно към вашето приложение след вход.

        - В Supabase отидете на `Authentication` > `URL Configuration`.

        - В полето `Site URL` въведете: http://localhost:3000 (за локална разработка).

    2. **Инициализиране на базата данни (SQL)**:  
    За да създадете автоматично нужните таблици и защитни политики (RLS).

        Отворете файла `db_setup.txt` (намиращ се в проекта) и копирайте цялото му съдържание.
        В Supabase отидете в менюто `SQL Editor` и изберете `New query`.
        Поставете копирания код в редактора и натиснете бутона `Run`.
   
    3. **Създаване на Storage Buckets (Хранилище)**:  
    Проектът се нуждае от две публични папки за съхранение на изображения

        1. Влезте в секция `Storage` > `Buckets`.
        2. Създайте нов bucket с име `bins`. Уверете се, че е маркиран като `Public`.
        3. Създайте втори bucket с име `report-images`, също маркиран като `Public`.  
      
      
    При възникване на други проблеми при инсталацията или стартирането на приложението, можете да се обърнете към официалната документация на съответните софтуерни рамки и приложения:
    - [Google Cloud](https://cloud.google.com/support-hub)
    - [Node.js](https://nodejs.org/docs/latest/api/)
    - [Git](https://git-scm.com/docs)
    - [GitHub](https://docs.github.com/en)
    - [Next.js](https://nextjs.org/docs)
    - [TypeScript](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
    - [Tailwind CSS](https://v2.tailwindcss.com/docs)
    - [Supabase](https://supabase.com/docs)
    - [ShadCN](https://ui.shadcn.com/docs)
    - [Jawg.io](https://www.jawg.io/docs/)
    - [Gemini API](https://ai.google.dev/gemini-api/docs)
    - [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)

## Стартиране и тестване
1. Стартирайте проекта чрез следната команда в терминала:
    ```bash
    npm run dev
    ```
2. В терминала трябва да получите съобщение за успех и адрес, на който приложението е активно:

    ```bash
    http://localhost:3000
    ```
3. Достъпете приложението на адреса и изпробвайте чрез предоставените тестови акаунти.

## Спиране на сървъра на приложението
Може да спрете сървъра на приложението по следните начини:
- Като затворите терминала, на който е стартиран.
- Като използвате комбинация `Ctrl + C`. 