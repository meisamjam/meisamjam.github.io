# Meisam Jamshidi Seikavandi — Academic Website

A dependency-free static academic website designed for GitHub Pages.

## Pages

- `index.html` — bio, research interests, selected work, and contact
- `research.html` — research areas, scientific programme, and methodological principles
- `publications.html` — searchable and filterable publication record
- `projects.html` — public datasets, code, protocols, and collaborations
- `supervision.html` — BSc/MSc project ideas with scope, hosting, data, and references
- `contact.html` — academic email and public profile links

## Editing content

Most structured content lives in:

```text
assets/js/data.js
```

Profile and contact links are kept separately in:

```text
assets/data/profile.js
```

Update these structured files to revise publications, projects, thesis ideas, references, profile links, or research interests. Layout and interaction code are separate:

```text
assets/css/styles.css
assets/js/main.js
```

## Publishing as a GitHub user site

1. Create a **public** repository named exactly `meisamjam.github.io`.
2. Add these files to the repository's `main` branch.
3. In **Settings → Pages**, choose **GitHub Actions** as the publishing source.
4. The included workflow deploys the site on every push to `main`.

The expected public URL is:

```text
https://meisamjam.github.io/
```

## Public-information policy

The site intentionally contains only material that is already public or suitable for public academic communication. It excludes private repositories, internal GN systems, unreleased company data, procurement details, and confidential operational information.

## Local preview

From the repository directory:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## License

Website code is provided under the MIT License. Publication text, linked papers, datasets, and third-party materials remain under their respective licenses.

## Continuing in VS Code

See [`START_HERE_VSCODE.md`](START_HERE_VSCODE.md). Automated setup scripts are included for PowerShell and Bash, and [`VSCODE_CONTINUATION_PROMPT.md`](VSCODE_CONTINUATION_PROMPT.md) preserves the project context for an AI assistant running inside VS Code.
