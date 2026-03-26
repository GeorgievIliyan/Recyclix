# Инструкции за инсталация и стартиране на проекта

## Нужен софтуер и инструменти
- [Git](https://git-scm.com/install/) - за клониране на проекта
- [Node.js](https://nodejs.org/en/download) - за javascript runtime
- Кодов/текстов редактор по Ваш избор (препоръчителен софтуер - [Visiual Studio Code](https://code.visualstudio.com/download))

Проверете статуса на инсталирания софтуер чрез следната команда в терминал (CMD):
```bash
npm --version && node --version
```

---

## Инсталация

Налични са два метода за инсталация на проекта:

#### Чрез Git и GitHub

1. Клонирайте git хранилището, като изпълните следната команда:
    ```bash
    git clone https://github.com/GeorgievIliyan/Recyclix.git
    ```
    > Главната директория на проекта е `Recyclix/` при този подход.

#### От .zip файл

1. Разархивирайте файла. Изходният код на проекта се намира в директория `503/`, която от тук нататък ще бъде наричана **главна директория**, ако сте използвали този подход.

---

#### Инсталиране на зависимостите (общи стъпки и за двата метода)

2. Отворете главната директория на проекта и стартирайте терминал (CMD / Terminal) в нея.
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
    Тези ключове са необходими, за да работят функциите за вход чрез Google. Могат да бъдат оставени празни, ако не желаете да използвате вписване чрез Google акаунт:

        - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET`:  
          
            Влезте в [Google Cloud Console](https://console.cloud.google.com/), създайте нов проект или изберете съществуващ. Отидете на `APIs & Services` > `Credentials`, изберете `Create Credentials` > `Auth Client ID`. Конфигурирайте като `Web Application` и копирайте получените `ID` и `Secret`.

    2. **Gemini API (Изкуствен интелект)**:
    Този ключ е необходим, за да работят функциите, базирани на изкуствен интелект. Може да бъде оставен празен, ако не желаете да използвате AI функционалност:

        - `GEMINI_API_KEY`:  
          
            Влезте в [Google Cloud Console](https://console.cloud.google.com/), създайте нов проект или изберете съществуващ. Отидете на `APIs & Services` > `Enabled APIs & Services` и активирайте `Gemini API` (`Generative AI`). След това отидете на `APIs & Services` > `Credentials`, изберете `Create Credentials` > `API Key` и копирайте получения ключ.

    3. **Supabase API Ключове** - уеб клиент за базата данни:  
        2.1. Създайте си акаунт в [Supabase](https://supabase.com/)  
        2.2. Създайте проект в Supabase  
        2.3. Отидете в таблото за управление на Вашия проект в Supabase:

        - `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`:   
        Ще ги намерите в `Project Settings` > `API`.

        - `SUPABASE_SERVICE_KEY`:  
        Намира се на същото място (`API`), но внимавайте да не го споделяте публично, защото дава административен достъп.

    4. **Връзка с Базата данни (PostgreSQL)**:
        - `DB_USERNAME` и `DB_PASSWORD`:  
        Използвайте потребителското име и паролата, които сте задали при самото създаване на проекта в `Supabase`. Можете да проверите настройките в `Project Settings` > `Database`.

    5. **Jawg Maps (Интерактивни карти)**:  
        - `NEXT_PUBLIC_JAWG_KEY`:
        Посетете [Jawg.io](https://www.jawg.io/en/), регистрирайте се и копирайте `Access Token` от секцията в страничното меню и го поставете в `.env` файла.

    Ето как трябва да изглежда Вашият `.env` файл накрая:
    ```ts
    NEXT_PUBLIC_GOOGLE_CLIENT_ID = <ключ>
    GOOGLE_CLIENT_SECRET = <ключ>
    GEMINI_API_KEY = <ключ>
    SECURE_API_KEY=75bb0888f4cb57a022496a9cc12f2843d04df4e87382508b88bb00aaba227e56f6ca92ac2591258ef54874ee731059a5eb13e2049b397a18efd2071cd237dbd6
    NEXTAUTH_SECRET=75bb0888f4cb57a022496a9cc12f2843d04df4e87382508b88bb00aaba227e56f6ca92ac2591258ef54874ee731059a5eb13e2049b397a18efd2071cd237dbd6
    NEXT_URL=http://localhost:3000
    NEXT_PUBLIC_SECURE_API_KEY =545587b9bf19a832405253af77d7f631096063b45cc63ad08373cc0e041c066419bf886897229a378505b9678cf9ffc2222ad6dc9fdf45667eae06ebdb104da4
    NEXT_PUBLIC_SUPABASE_URL = <ключ>
    NEXT_PUBLIC_SUPABASE_ANON_KEY = <ключ>
    SUPABASE_SERVICE_KEY = <ключ>
    DB_USERNAME = <потребителско-име>
    DB_PASSWORD = <парола>
    NODE_ENV = development
    NEXT_PUBLIC_JAWG_KEY = <ключ>
    ```

2. **Настройка на Supabase Dashboard**  
    След като попълните .env файла, трябва да подготвите самата база данни и облачното хранилище:

    1. **Упълномощаване на URL адреси**:  
    За да може Supabase да пренасочва потребителите обратно към Вашето приложение след вход.

        - В Supabase отидете на `Authentication` > `URL Configuration`.

        - В полето `Site URL` въведете: http://localhost:3000 (за локална разработка).

    2. **Инициализиране на базата данни (SQL)**:  
    За да създадете автоматично нужните таблици и защитни политики (RLS).

        Отворете файла `db_setup.txt` (намиращ се в проекта) и копирайте цялото му съдържание.
        В Supabase отидете в менюто `SQL Editor` и изберете `New query`.
        Поставете копирания код в редактора и натиснете бутона `Run`.

        > Забележка: Изпълнението може да отнеме повече време поради обема на заявката. Можете да я изпълните на части.
   
    3. **Създаване на Storage Buckets (Хранилище)**:  
    Проектът се нуждае от две публични папки за съхранение на изображения

        1. Влезте в секция `Storage` > `Buckets`.
        2. Създайте нов bucket с име `bins`. Уверете се, че е маркиран като `Public`.
        3. Създайте втори bucket с име `report-images`, също маркиран като `Public`.  
      
    При възникване на други проблеми при инсталацията или стартирането на приложението, можете да се обърнете към официалната документация на съответните софтуерни рамки, библиотеки, платформи и приложения:
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
    В терминала трябва да получите съобщение за успех и адрес, на който приложението е активно:

    ```bash
    http://localhost:3000
    ```

3. **Вкарване на контейнери в базата данни**:  
    За да може да използвате приложението и да разглеждате реални локации на контейнери, постъпете следния URL адрес:  
     ```bash
    http://localhost:3000/api/update-bins/
    ```
3. **Употреба:**  
    **Достъпни URL пътища на приложението**:
    ```bash
    # начална страница
    /
    # администрация
    /admin/panel
    # табло на мениджър на организация
    /org/dashboard
    # главни
    /app/dashboard
    /app/map
    /app/request-access
    /app/rewards
    /app/tasks
    # акаунти и автентификация
    /auth/account
    /auth/callback
    /auth/login
    /auth/register
    /auth/reset-password
    # интерфейс на smart контейнери
    /bin/scan
    ```
    Достъпете приложението на адреса и изпробвайте чрез предоставените тестови акаунти.



## Спиране на сървъра на приложението
Може да спрете сървъра на приложението по следните начини:
- Като затворите терминала, на който е стартиран.
- Чрез комбинация `Ctrl + C`. 