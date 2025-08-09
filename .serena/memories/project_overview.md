# Software Estimation Manager - Project Overview

## Purpose
Desktop application for managing economic estimates for software application development. Built with Electron, it provides a comprehensive solution for creating, managing, and analyzing software project cost estimates.

## Core Features
- **Feature Management**: Complete CRUD operations for project features with categorization
- **Project Phases**: 8-phase project structure with automatic development phase calculation
- **Configuration System**: Hierarchical config (Global → Project → Local) for suppliers, resources, categories
- **Calculations Dashboard**: Real-time cost calculations with breakdowns by phases, suppliers, categories
- **Version Management**: Automatic version updates and history tracking
- **Export/Import**: Multi-format support (JSON, CSV, Excel) with structured reporting
- **Data Persistence**: Dual strategy (Electron file system + localStorage fallback)

## Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (component-based architecture)
- **Backend**: Electron (Node.js)
- **Persistence**: Electron Store + localStorage fallback
- **Testing**: Jest (unit/behavioral) + Cucumber (E2E) + Playwright
- **Build**: Electron Builder (Windows, macOS, Linux)
- **Libraries**: Papa Parse (CSV), XLSX (Excel), UUID, Font Awesome

## Architecture Highlights
- Component-based modular architecture
- Hierarchical configuration system with inheritance
- Version management with automatic updates
- VSCode-style dark theme
- Secure IPC with context isolation
- Real-time calculations and auto-save functionality

## Business Domain
- Software project estimation and cost management
- Resource allocation and phase management
- Multi-format reporting and data export
- Configuration management for development organizations