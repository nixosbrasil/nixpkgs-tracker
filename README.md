# Nixpkgs Tracker

A web application to track the status of [Nixpkgs](https://github.com/NixOS/nixpkgs) Pull Requests across different channels and branches.

This tool helps NixOS users and maintainers verify if a specific Pull Request has been merged into branches like `nixos-unstable`, `nixpkgs-unstable`, `master`, or `staging-next`.

## Features

- **Multi-branch Tracking**: Check if a PR is present in various NixOS/nixpkgs branches.
- **Detailed PR Info**: View PR title, description, labels, author, and reviewers.
- **CI Status**: See the status of CI checks (OfBorg, GitHub Actions).
- **History**: Keeps a local history of your recently tracked PRs.
- **Rate Limit Handling**: Option to provide a GitHub Personal Access Token to avoid API rate limits.
- **Responsive Design**: Built with Tailwind CSS and DaisyUI for a modern look.

## Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [DaisyUI](https://daisyui.com/)
- **Language**: TypeScript
- **Internationalization**: [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)

## Development

To get started with development:

1. Clone the repository:

   ```bash
   git clone https://github.com/nixosbrasil/nixpkgs-tracker.git
   cd nixpkgs-tracker
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

## Building

To create a production version of the app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

## License

This project is licensed under the [MIT License](LICENSE).
