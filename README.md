# Datacard Builder

A dependency-free webpage for packaging course datacards. Enter a course code and name, add simulator or resource details with either an HTTPS link or an HTML filename, and optionally attach the corresponding HTML files and any supporting assets they need. The builder downloads a `<courseCode>.zip` containing `datacard.json`, every attached HTML file, and all selected supporting files. Supporting files are packaged only and are not listed in the JSON.

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy to GitHub Pages

The `Deploy static site to Pages` workflow publishes the site whenever a commit
lands on `main`. In the repository's **Settings → Pages**, set **Source** to
**GitHub Actions**. The workflow can also be started manually from the Actions
tab.
