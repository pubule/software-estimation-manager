# Task Completion Procedures

## After Completing Any Development Task

### 1. Testing
```bash
# Run unit tests to ensure no regressions
npm test

# Run tests with coverage to check code coverage
npm run test:coverage

# Run E2E tests for integration testing
npm run test:e2e

# Run all tests for comprehensive validation
npm run test:all
```

### 2. Code Quality
- **No formal linting configured**: Project doesn't have ESLint/Prettier setup
- **Manual code review**: Follow existing code style and conventions
- **Check console errors**: Ensure no JavaScript errors in browser console
- **Verify Electron functionality**: Test in actual Electron environment

### 3. Build Verification
```bash
# Test build process works
npm run build

# Test specific platform builds if needed
npm run build:win
npm run build:mac
npm run build:linux
```

### 4. Manual Testing
- **Start application**: `npm run dev` or `npm start`
- **Test core workflows**: Create project, add features, save, export
- **Test all navigation sections**: Projects, Features, Phases, Calculations, Configuration, History
- **Test data persistence**: Save/load projects, configuration changes
- **Cross-platform testing**: Verify on target platforms

### 5. Documentation
- **Update CLAUDE.md**: If architectural changes were made
- **Update README.md**: If user-facing features were added
- **Add behavioral tests**: Document new behaviors in test suite
- **Comment complex logic**: Add inline comments for complex business logic

### 6. Version Control
```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: description of changes"

# Push to repository
git push
```

## Critical Script Loading Order
When modifying HTML files, **ALWAYS** maintain this order:
```html
<!-- 1. Base classes FIRST -->
<script src="js/utils/base-component.js"></script>

<!-- 2. Utilities -->
<script src="js/utils/modal-manager.js"></script>
<script src="js/utils/helpers.js"></script>

<!-- 3. Components (that depend on base classes) -->
<script src="js/components/..."></script>
```

## Performance Considerations
- **Test with realistic data**: Create projects with 100+ features
- **Monitor memory usage**: Check for memory leaks in long sessions
- **Verify auto-save**: Ensure 2-minute auto-save works correctly
- **Test file operations**: Verify all export/import functions work

## Security Checklist
- **No secrets in code**: Ensure no API keys or passwords in source
- **Validate user input**: Check all form inputs are properly validated
- **IPC security**: Verify proper use of context isolation in Electron
- **File path validation**: Ensure safe file operations

## Deployment Preparation
- **Version bump**: Update version in package.json if needed
- **Test installers**: Verify built installers work correctly
- **Test on clean systems**: Test installation on fresh systems
- **Performance benchmarks**: Verify acceptable startup and operation times