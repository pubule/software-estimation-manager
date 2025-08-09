# Suggested Commands

## Development Commands
```bash
# Start development with hot reload
npm run dev

# Start Electron application
npm start

# Watch for changes (used by dev command)
npm run watch
```

## Build Commands
```bash
# Build for all platforms
npm run build

# Build for specific platforms
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux

# Create distributable packages
npm run dist
npm run pack          # Build without distribution
```

## Testing Commands
```bash
# Run all unit/behavioral tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run end-to-end tests with Cucumber
npm run test:e2e

# E2E test variations
npm run test:e2e:headless   # Run headless
npm run test:e2e:visible    # Run with visible browser
npm run test:e2e:slow       # Run with 1000ms slow motion
npm run test:e2e:debug      # Run with debug mode and 500ms slow motion

# Run all tests (unit + e2e)
npm run test:all

# Generate Cucumber reports
npm run cucumber:report
```

## Package Management
```bash
# Install dependencies
npm install

# Install app dependencies (post-install)
npm run postinstall
```

## Windows-Specific Commands
```cmd
# List directory contents
dir
ls                    # If using Git Bash or WSL

# Change directory
cd path\to\directory

# Find files
where filename
findstr "pattern" *.js

# Process management
tasklist              # List running processes
taskkill /F /PID 1234 # Kill process by PID
```

## Git Commands
```bash
git status
git add .
git commit -m "message"
git push
git pull
git log --oneline
```

## Useful Development Commands
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Clear npm cache
npm cache clean --force

# Install specific package
npm install package-name --save
npm install package-name --save-dev
```