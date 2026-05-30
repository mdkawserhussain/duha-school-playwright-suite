# Project Overview - Nagorik Sheba

## Project Description
Nagorik Sheba is a comprehensive service directory system for Bogura district, built with Laravel 12. It provides a platform for users to discover and submit local services across multiple categories including healthcare, transportation, business, education, and more.

## Technology Stack

### Backend
- **Framework**: Laravel 12 (PHP 8.2+)
- **Database**: MySQL 8.0+ / MariaDB 10.6+
- **Image Processing**: Intervention Image v3
- **Media Library**: Spatie Laravel Media Library
- **Permissions**: Spatie Laravel Permission
- **Search**: Laravel Scout with Meilisearch
- **Excel**: Maatwebsite Excel

### Frontend
- **Templating**: Blade Templates
- **CSS Framework**: Tailwind CSS v4
- **JavaScript**: Alpine.js v3
- **Build Tool**: Vite
- **Icons**: Feather Icons, Font Awesome, Tabler Icons

### Development Tools
- **Testing**: Pest PHP
- **Code Style**: Laravel Pint
- **Package Manager**: Composer, NPM

## Architecture Pattern

The project follows **Controller → Service → Repository (CSR)** pattern:

1. **Controllers**: Handle HTTP requests/responses, validation, authorization
2. **Services**: Business logic, orchestration, notifications
3. **Repositories**: Data access layer, query composition
4. **Models**: Eloquent models with relationships and scopes

## Key Features

- 3-level category hierarchy (Super Category → Category → Sub Category)
- User-submitted listings with admin approval workflow
- Doctor profiles with appointment booking
- Blood donor directory with filtering
- Advanced search and filtering
- Image optimization (WebP conversion)
- Security features (XSS protection, file validation)
- Activity logging
- Admin panel with bulk actions

## Project Structure

```
app/
├── Http/Controllers/
│   ├── Admin/          # Admin panel controllers
│   ├── Frontend/       # Public-facing controllers
│   └── Auth/           # Authentication controllers
├── Models/             # Eloquent models
├── Repositories/       # Data access layer
│   └── Interfaces/     # Repository interfaces
├── Services/           # Business logic layer
├── Helpers/            # Helper classes
├── Notifications/      # Email notifications
└── Providers/          # Service providers

resources/
├── views/
│   ├── admin/          # Admin panel views
│   ├── frontend/       # Public views
│   └── components/     # Reusable Blade components
├── css/                # Tailwind CSS
└── js/                 # JavaScript files

routes/
├── web.php             # Web routes
└── api.php             # API routes
```

