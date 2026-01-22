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
   
   This command compiles both TypeScript source files and SASS stylesheets. You can also run them separately:
   - `npm run compile:ts` - Compile TypeScript only
   - `npm run compile:sass` - Compile SASS styles only

4. **Run in Development Mode**
   - Open the project in VS Code
   - Press `F5` to open the Extension Development Host
   - The extension will be loaded and ready to test

### Development Commands

- `npm run compile` - Compile TypeScript and SASS (runs both `compile:ts` and `compile:sass`)
- `npm run compile:ts` - Compile TypeScript source files to JavaScript
- `npm run compile:sass` - Compile SASS stylesheets to CSS
- `npm run watch` - Watch for changes and automatically recompile both TypeScript and SASS files
- `npm run lint` - Run ESLint to check code quality
- `npm run package` - Package the extension as a `.vsix` file

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
