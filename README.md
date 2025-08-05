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
├── config/                     # External configuration files
│   └── defaults.json           # Default data configuration
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
│           │   ├── default-config-manager.js # External config loader
│           │   ├── feature-manager.js    # Feature management
│           │   ├── navigation.js         # Navigation
│           │   ├── modal.js             # Modal system
│           │   └── notification-manager.js # Notifications
│           └── utils/
│               └── helpers.js   # Utilities
├── assets/                     # Static resources
└── dist/                      # Compiled files
```

## Configuration System

The application uses an external configuration system to load default data for suppliers, internal resources, categories, and project phases. This allows for easy customization without modifying the application code.

### Configuration File Structure

The configuration is stored in `{ProjectsPath}/config/defaults.json` where `{ProjectsPath}` is the projects folder configured in **Configuration → File System Storage**. By default this is in your Documents folder: `~/Documents/Software Estimation Projects/config/defaults.json`.

The configuration file has the following structure:

```json
{
  "phaseDefinitions": [
    {
      "id": "functionalAnalysis",
      "name": "Functional Analysis",
      "description": "Business requirements analysis and functional specification",
      "type": "analysis",
      "defaultEffort": { "G1": 100, "G2": 0, "TA": 20, "PM": 50 },
      "editable": true
    }
  ],
  "defaultSuppliers": [
    {
      "id": "supplier-g1-it",
      "name": "Example Supplier",
      "role": "G1",
      "department": "IT",
      "realRate": 450.00,
      "officialRate": 450.00,
      "isGlobal": true
    }
  ],
  "defaultInternalResources": [
    {
      "id": "internal-analyst-it",
      "name": "Internal Analyst",
      "role": "G1",
      "department": "IT",
      "realRate": 600.00,
      "officialRate": 600.00,
      "isGlobal": true
    }
  ],
  "defaultCategories": [
    {
      "id": "development-activities",
      "name": "DEVELOPMENT ACTIVITIES",
      "description": "Software development and coding tasks",
      "status": "active",
      "isGlobal": true,
      "featureTypes": [
        {
          "id": "new-feature-dev",
          "name": "New Feature Development",
          "description": "Development of new application features",
          "averageMDs": 5
        }
      ]
    }
  ]
}
```

### Configuration Loading

The application automatically loads configuration from the external file at startup:

1. **Primary**: Loads from `{ProjectsPath}/config/defaults.json` using the configured projects folder
2. **Fallback**: Uses built-in defaults if external file is missing or invalid
3. **Validation**: Automatically validates structure and provides fallback values
4. **Path Resolution**: Automatically detects the projects path from File System Storage configuration

### Customizing Configuration

To customize the default data:

1. **Locate config folder**: Navigate to your configured projects folder (default: `~/Documents/Software Estimation Projects/`)
2. **Create config structure**: Create a `config` subfolder if it doesn't exist
3. **Edit config file**: Create or modify `config/defaults.json` with your organization's data
4. **Backup original**: Keep a backup of the original file
5. **Restart application**: Changes take effect after application restart
6. **Validation**: Invalid configurations will fall back to built-in defaults

### Configuration File Location

The configuration file location depends on your **File System Storage** settings:

- **Default**: `~/Documents/Software Estimation Projects/config/defaults.json`
- **Custom Path**: `{YourProjectsPath}/config/defaults.json`
- **Change Path**: Go to **Configuration → File System Storage** to change the projects folder

**Note**: When you change the projects folder, you'll need to copy the `config/defaults.json` file to the new location.

### Configuration Sections

#### Phase Definitions
- **id**: Unique phase identifier
- **name**: Display name
- **description**: Phase description
- **type**: Phase type (analysis, development, testing, support)
- **defaultEffort**: Default effort distribution percentages (G1, G2, TA, PM)
- **editable**: Whether phase can be modified
- **calculated**: Whether phase is auto-calculated (for development phase)

#### Default Suppliers
- **id**: Unique supplier identifier
- **name**: Supplier company name
- **role**: Resource role (G1, G2, TA, PM)
- **department**: Department (IT, etc.)
- **realRate**: Actual daily rate
- **officialRate**: Official/invoiced daily rate
- **isGlobal**: Whether supplier is globally available

#### Default Internal Resources
- **id**: Unique resource identifier
- **name**: Resource name/title
- **role**: Resource role (G1, G2, TA, PM)
- **department**: Department (IT, RO, etc.)
- **realRate**: Actual daily rate
- **officialRate**: Official daily rate
- **isGlobal**: Whether resource is globally available

#### Default Categories
- **id**: Unique category identifier
- **name**: Category display name
- **description**: Category description
- **status**: Status (active, inactive)
- **isGlobal**: Whether category is globally available
- **featureTypes**: Array of predefined feature types with:
  - **id**: Unique feature type identifier
  - **name**: Feature type name
  - **description**: Feature type description
  - **averageMDs**: Average man days for this feature type

### Error Handling

The configuration system includes robust error handling:

- **Missing file**: Uses built-in fallback data
- **Invalid JSON**: Logs warning and uses fallback
- **Invalid structure**: Validates each section independently
- **Network errors**: Handles fetch failures gracefully
- **Partial loading**: Loads valid sections even if others fail

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