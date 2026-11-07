# Publish this assignment on GitHub Pages

Prepared for **Akarsh J, Group 4, Member 1, Project Lead**.

The website is ready to upload. It runs the JavaScript version of the numerical
model in your browser. The MATLAB file is available as a download; GitHub Pages
does not execute MATLAB code.

## Easiest route: upload through GitHub's website

1. Extract `Assignment10_Akarsh_G4_M1_Package.zip` on your computer.
2. Sign in to [GitHub](https://github.com/) and create a **new public repository**
   named `ee315-assignment10`. A public repository works with GitHub Free.
3. In that repository, choose **Add file → Upload files**. Upload the **contents**
   of the extracted folder, including `index.html`, `styles.css`, `solver.js`,
   `app.js`, `worker.js`, the `assets/` folder, the `.m` file, README and the report. Commit the upload.
   `index.html` must be visible at the repository's top level. Do not upload
   only the ZIP and do not put the whole site one directory below the root.
   `.nojekyll` is included for static hosting; this site's plain filenames also
   work if Windows hides that file and you omit it.
4. Open **Settings → Pages**.
5. Under **Build and deployment → Source**, choose **Deploy from a branch**.
6. Select **main** and **/ (root)**, then click **Save**.
7. Wait for GitHub Pages to finish deploying. Refresh Settings → Pages and click
   the **Visit site** link shown there. Deployment can take several minutes.

For that repository name, the project URL follows this template:

```text
https://YOUR_GITHUB_USERNAME.github.io/ee315-assignment10/
```

That is a template, **not an already deployed URL**. Replace the placeholder with
your actual GitHub username, or use the verified Visit site link from Settings.

## If you want exactly username.github.io

Create a repository named exactly `YOUR_GITHUB_USERNAME.github.io`, upload the
site files to its root and enable Pages from `main` / root. Your website will
then be served at the account's root GitHub Pages address. Use a separate
`ee315-assignment10` project repository if you already have a personal homepage
and want to keep it.

## Final checks on the published page

- Identity: Akarsh J, roll 240002007, Group 4, Member 1, project lead.
- Default Rf: 7 Ω. Default loading: 100% study case.
- Click **Find critical clearing time**. Expect no finite boundary in the 0–3 s scan.
- Run fault durations 0.1 s and 3 s and inspect the rotor-angle plots.
- Test the MATLAB and CSV download buttons.

All asset links are relative, so the same files work at either a project URL
or a root `username.github.io` URL. No paid hosting, database, build step,
API key, GitHub Actions workflow or external JavaScript library is required.

## If you see a problem

| Symptom | Fix |
|---|---|
| 404 | Ensure `index.html` is at the selected publishing root and Pages deployment has completed. |
| Files listed, but no interactive page | Open the Pages URL from Settings, not the repository's source-code URL. |
| Missing layout or solver | Upload all website files and the assets/ folder together; preserve their exact lowercase names. |
| Source says no branch | Commit the uploaded files first, then select `main` in Pages. |
| Old version after upload | Wait for deployment and hard-refresh the browser. |
| Worker cannot load when double-clicking locally | Use the deployed HTTPS URL or run a local static server; the site includes a main-thread fallback for restricted local contexts. |

Reference: [official GitHub Pages quickstart](https://docs.github.com/en/pages/quickstart).

## Publishing status

At preparation time no authenticated GitHub account/repository was available to
the assistant. The package is ready; no GitHub repository was created or website
published by the assistant. To have the assistant complete publishing, install
and connect the GitHub integration and provide your target repository link or
GitHub username. Do not send a password or personal access token in chat.
