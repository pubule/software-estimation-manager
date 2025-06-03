# Software Estimation Manager

A standalone desktop application built with Electron for managing economic estimates for software application development.

## Key Features

- **Modern interface** with VSCode-like dark theme
- **Complete feature management** with categorization and resource assignment
- **Project phase configuration** with automatic calculations
- **Calculations dashboard** with detailed visualizations
- **Configuration system** for suppliers, internal resources, and parameters
- **Export/Import** in multiple formats (JSON, CSV, Excel)
- **Versioning system** for change history
- **Local persistence** with backup and restore

## Tech Stack

- **Electron** - Desktop application framework
- **HTML5/CSS3/JavaScript** - Frontend
- **Node.js** - Backend/Main process
- **Electron Store** - Data persistence
- **Font Awesome** - Icons
- **Papa Parse** - CSV processing
- **XLSX** - Excel processing

## Project Structure

```
software-estimation-manager/
├── package.json                 # Project configuration
├── src/
│   ├── main.js                 # Electron main process
│   └── renderer/               # Renderer process
│       ├── index.html          # Main interface
│       ├── styles/             # CSS styles
│       │   ├── main.css        # Base styles
│       │   └── themes/
│       │       └── vscode-dark.css  # VSCode dark theme
│       └── js/                 # Frontend JavaScript
│           ├── main.js         # Main application
│           ├── data-manager.js # Data management
│           ├── components/     # Modular components
│           │   ├── feature-manager.js    # Feature management
│           │   ├── navigation.js         # Navigation
│           │   ├── modal.js             # Modal system
│           │   └── notification-manager.js # Notifications
│           └── utils/
│               └── helpers.js   # Utilities
├── assets/                     # Static resources
└── dist/                      # Compiled files
```

## Installation and Setup

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd software-estimation-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   # For all platforms
   npm run build
   
   # For specific platforms
   npm run build:win    # Windows
   npm run build:mac    # macOS
   npm run build:linux  # Linux
   ```

## Implemented Features

### 1. Features Management
- ✅ Complete tabular list with full CRUD
- ✅ Fields: ID, Description, Category, Supplier, Man Days, Notes
- ✅ Filters by category, supplier, and search
- ✅ Column sorting
- ✅ Data validation
- ✅ CSV Export/Import

### 2. Project Phases
- ✅ Configuration of 8 predefined phases
- ✅ Automatic calculation of Development phase
- ✅ Resource assignment per phase
- ✅ Automatic cost calculations
- ✅ Project summary view

### 3. Calculations Dashboard
- ✅ General project metrics
- ✅ Breakdown by phases
- ✅ Breakdown by suppliers
- ✅ Breakdown by categories
- ✅ Tabular visualizations

### 4. Configuration
- ✅ External supplier management
- ✅ Internal resource management
- ✅ Category configuration
- ✅ Calculation parameters
- ✅ Tabbed interface

### 5. Data Management
- ✅ Persistence with Electron Store
- ✅ Auto-save every 2 minutes
- ✅ JSON/CSV export
- ✅ Complete backup and restore
- ✅ Data validation

### 6. UI/UX
- ✅ VSCode-style dark theme
- ✅ Sidebar navigation
- ✅ Notification system
- ✅ Responsive modals
- ✅ Keyboard shortcuts
- ✅ Loading states

## Pending Features

### Templates Management
- ⏳ Template creation and management
- ⏳ Template application to projects
- ⏳ Template versioning

### Version History
- ⏳ Complete versioning system
- ⏳ Version comparison
- ⏳ Rollback to previous versions
- ⏳ Version comments

### Advanced Export
- ⏳ Complete Excel export with multiple sheets
- ⏳ Customizable export templates
- ⏳ Charts in exports

### Integrations
- ⏳ API for external integrations
- ⏳ Plugin system
- ⏳ Cloud synchronization

## Using the Application

### Creating a New Project

1. **File → New Project** or `Ctrl+N`
2. The application will create a project with default data
3. Start by adding features in the "Features Management" section

### Managing Features

1. Navigate to **Features Management**
2. Use **Add Feature** to add new functionalities
3. Complete all required fields:
    - **ID**: Unique identifier (auto-generated)
    - **Description**: Detailed description
    - **Category**: Feature category
    - **Supplier**: Assigned supplier or resource
    - **Man Days**: Estimated man days
    - **Notes**: Additional notes (optional)

### Configuring Project Phases

1. Navigate to **Project Phases**
2. Configure man days for each phase (except Development)
3. Development phase is calculated automatically
4. Review cost summary and duration

### Viewing Calculations

1. Navigate to **Calculations**
2. Review general metrics
3. Analyze breakdown by phases, suppliers, and categories
4. Export reports if needed

### System Configuration

1. Navigate to **Configuration**
2. **Suppliers**: Configure external suppliers with rates
3. **Internal Resources**: Configure internal resources
4. **Categories**: Define feature categories
5. **Parameters**: Adjust calculation parameters

## Keyboard Shortcuts

- `Ctrl+N` - New project
- `Ctrl+O` - Open project
- `Ctrl+S` - Save project
- `Ctrl+1-6` - Navigate between sections
- `Ctrl+,` - Open configuration
- `Escape` - Close modals

## Data Structure

### Project
```json
{
  "project": {
    "id": "unique_id",
    "name": "Project Name",
    "version": "1.0.0",
    "created": "2025-01-01T00:00:00.000Z",
    "lastModified": "2025-01-01T00:00:00.000Z",
    "comment": "Version comment"
  },
  "features": [...],
  "phases": {...},
  "config": {...}
}
```

### Feature
```json
{
  "id": "BR-001",
  "description": "User authentication system",
  "category": "security",
  "supplier": "supplier1",
  "manDays": 5.0,
  "notes": "Include 2FA implementation",
  "created": "2025-01-01T00:00:00.000Z",
  "modified": "2025-01-01T00:00:00.000Z"
}
```

## Development

### Adding New Features

1. **Create component** in `src/renderer/js/components/`
2. **Add styles** in corresponding CSS files
3. **Integrate in navigation** if necessary
4. **Update data-manager** if persistence is required
5. **Add tests** (when testing is implemented)

### Component Structure

Each component follows the pattern:
```javascript
class ComponentName {
    constructor(dependencies) {
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Event listeners
    }
    
    // Public methods
    
    // Private methods
}
```

### Code Conventions

- **Camel case** for variables and functions
- **Pascal case** for classes
- **Kebab case** for CSS classes and IDs
- **JSDoc** for function documentation
- **Async/await** for asynchronous operations

## Troubleshooting

### Application won't start
- Check Node.js version
- Run `npm install` to reinstall dependencies
- Check logs in development console

### Persistence issues
- Check write permissions in user directory
- Restart the application
- Use "File → Backup Data" to create manual backup

### Slow performance
- Check number of features (optimized for <1000)
- Close other heavy applications
- Check available disk space

## Roadmap

### v1.1.0
- [ ] Complete template system
- [ ] Functional version history
- [ ] Advanced Excel export
- [ ] UI/UX improvements

### v1.2.0
- [ ] Charts and graphs
- [ ] Reporting system
- [ ] Project comparison
- [ ] Advanced configuration

### v2.0.0
- [ ] Multi-project mode
- [ ] Basic collaboration
- [ ] External API
- [ ] Plugin system

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

This project is under the MIT license. See `LICENSE` file for more details.

## Support

For technical support or bug reports:
- Create issue on GitHub
- Email: [your-email@domain.com]
- Documentation: [project-wiki-url]

---

**Software Estimation Manager v1.0.0**  
Built with ❤️ using Electron and modern web technologies.