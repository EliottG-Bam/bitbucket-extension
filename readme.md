# Bitbucket Extension – Read Your Code Commit by Commit

This extension improves your Bitbucket experience by letting you navigate **commit by commit** in pull requests — using keyboard shortcuts or on-screen buttons.

---

## 🚀 Getting Started

To enable this functionality, follow these simple steps:

1. **Install the Chrome Extension**  
   👉 [User JavaScript and CSS](https://chromewebstore.google.com/detail/user-javascript-and-css/nbhcbdghjpllgmfilhnhkllmkecfmpld)

2. **Activate Developer Mode**  
   Open `chrome://extensions/` in your browser and toggle on **Developer mode** (works on Chromium-based browsers).

3. **Create Two New Rules**  
   In the "User JavaScript and CSS" extension:

   - Create **two new rules**.
   - Name them as you wish.
   - Use the following URL pattern to target Bitbucket:
     ```
     https://bitbucket.org/*
     ```

---

## 🧩 Add the Script and Styles

- **Rule 1**  
  Add the contents of the following files:

  - `styles.css` → _CSS tab_
  - `add-commits-nav.js` → _JavaScript tab_

---

## 🔄 Final Step

- **Reload your browser.**
- Open a Bitbucket PR — you should now be able to:
  - Navigate **commit by commit** using the `n` (next) and `p` (previous) keys
  - Use newly added **navigation buttons** at the top of the screen

Additionally, comments made on individual commits will be **copied to the PR** (still a work in progress ✨).

---

## 🎉 Enjoy!

Make code reviews smoother and more granular, one commit at a time.

Made by [Eliott G](https://github.com/eliottg) and [GuiLec](https://github.com/GuiLec)

License: MIT
