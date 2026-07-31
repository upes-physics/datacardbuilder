# Datacard Builder

A dependency-free webpage for packaging course datacards. Enter a course code and name, add simulator or resource details, and optionally attach HTML files. The builder downloads a `<courseCode>.zip` containing `datacard.json` and every attached HTML file.

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
