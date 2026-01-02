# Contributing to ToDo4VCode

Thank you for your interest in contributing to ToDo4VCode! This document provides guidelines and instructions for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 20.x or higher
- npm (comes with Node.js)
- Visual Studio Code (recommended)

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yurier98/ToDo4VCode.git
   cd ToDo4VCode
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run compile
   ```

4. **Run in Development Mode**
   - Open the project in VS Code
   - Press `F5` to open the Extension Development Host
   - The extension will be loaded and ready to test

### Development Commands

- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and recompile automatically
- `npm run lint` - Run ESLint to check code quality
- `npm run package` - Package the extension as a `.vsix` file

## Publishing the Extension

### Setting Up Marketplace Tokens

To publish the extension to the VS Code Marketplace and Open VSX Registry, you need to configure Personal Access Tokens (PATs) as GitHub repository secrets.

#### 1. VS Code Marketplace Token (`VSCE_PAT`)

**Creating the token:**

1. Go to [Azure DevOps](https://dev.azure.com/)
2. Sign in with your Microsoft account
3. Click on your profile icon in the top right corner
4. Select **Personal access tokens**
5. Click **+ New Token**
6. Configure the token:
   - **Name**: `VS Code Marketplace - ToDo4VCode`
   - **Organization**: Select **All accessible organizations**
   - **Expiration**: Set according to your preference (recommended: 90 days or more)
   - **Scopes**: Select **Marketplace** > **Manage** (this gives full marketplace access)
7. Click **Create**
8. **Important**: Copy the token immediately - you won't be able to see it again!

**Publishing requirements:**
- You must have a publisher account on the VS Code Marketplace
- Your publisher ID should match the `publisher` field in `package.json` (currently: `YurierHerrera`)
- **Note**: Marketplace URLs may use different casing (e.g., `yurierherrera` vs `YurierHerrera`). Verify the correct URL format for your publisher on the [VS Code Marketplace manage page](https://marketplace.visualstudio.com/manage)
- For more info, see the [official publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

#### 2. Open VSX Registry Token (`OVSX_PAT`)

**Creating the token:**

1. Go to [Open VSX Registry](https://open-vsx.org/)
2. Sign in with your GitHub account
3. Click on your profile in the top right corner
4. Select **Access Tokens**
5. Click **Generate New Token**
6. Configure the token:
   - **Description**: `ToDo4VCode Publishing`
7. Click **Generate**
8. **Important**: Copy the token immediately - you won't be able to see it again!

**Publishing requirements:**
- You must have an account on Open VSX
- Your namespace should match the publisher (currently: `YurierHerrera`)
- **Note**: Open VSX Registry URLs may use different casing conventions. Verify the correct URL format on your [Open VSX profile page](https://open-vsx.org/user-settings/namespaces)
- For more info, see the [Open VSX documentation](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions)

#### 3. Adding Secrets to GitHub Repository

Once you have both tokens, add them to your GitHub repository:

1. Go to your repository on GitHub: `https://github.com/yurier98/ToDo4VCode`
2. Click on **Settings** (you need admin access)
3. In the left sidebar, click **Secrets and variables** > **Actions**
4. Click **New repository secret**
5. Add the first secret:
   - **Name**: `VSCE_PAT`
   - **Value**: Paste your VS Code Marketplace token
   - Click **Add secret**
6. Add the second secret:
   - **Name**: `OVSX_PAT`
   - **Value**: Paste your Open VSX Registry token
   - Click **Add secret**

### Publishing Workflow

The extension is automatically published when you push a Git tag starting with `v`:

```bash
# Update version in package.json first
npm version patch  # or minor, or major

# Push the tag
git push --follow-tags
```

This triggers the "Package Extension" GitHub Actions workflow which:
1. Builds and compiles the extension
2. Runs linting checks
3. Packages the extension as a `.vsix` file
4. Creates a GitHub release (if triggered by a tag)
5. Publishes to VS Code Marketplace (if triggered by a tag and `VSCE_PAT` is set)
6. Publishes to Open VSX Registry (if triggered by a tag and `OVSX_PAT` is set)

### Manual Publishing

If you prefer to publish manually:

```bash
# Package the extension
npm run package

# Publish to VS Code Marketplace
npx vsce publish

# Publish to Open VSX
npx ovsx publish
```

**Note**: For manual publishing, you'll need to provide the tokens:
- For vsce: `npx vsce publish -p YOUR_VSCE_PAT`
- For ovsx: `npx ovsx publish -p YOUR_OVSX_PAT`

## Code Style

- The project uses ESLint for code quality
- TypeScript is used for all source files
- Follow the existing code style in the project
- Run `npm run lint` before committing

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run linting and tests (`npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Questions or Issues?

If you have questions or run into issues:
- Open an issue on [GitHub Issues](https://github.com/yurier98/ToDo4VCode/issues)
- Contact: yurierjesus@gmail.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
