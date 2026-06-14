# FoodBridge Frontend — Astro & Tailwind CSS v4

This is the modern frontend of the FoodBridge real-time surplus food coordination platform, rewritten in [Astro](https://astro.build/) with [Tailwind CSS v4](https://tailwindcss.com/) for high performance, premium aesthetics, and responsive layout.

For details on the full stack, including database models and APIs, refer to the [root README.md](file:///Users/nivedmohan/Documents/food%20bridge%20copy/README.md).

## 🚀 Project Structure

Inside of this Astro project, you'll see the following structure:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets/
│   ├── components/
│   ├── layouts/
│   │   └── Layout.astro     # Main application shell with design tokens
│   └── pages/
│       ├── index.astro       # Landing & landing dashboard API handler settings
│       ├── dashboard.astro   # Main app interface (Donors & Receivers views, chats, history)
│       ├── about.astro       # Mission & impact overview
│       ├── contact.astro     # Contact & inquiries page
│       ├── privacy-policy.astro
│       ├── terms-conditions.astro
│       ├── 404.astro         # Custom 404 Not Found page
│       └── 500.astro         # Custom 500 Internal Server Error page
└── package.json
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
