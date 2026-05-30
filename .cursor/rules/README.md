# Cursor Rules for Nagorik Sheba

This directory contains comprehensive rules and guidelines for working with the Nagorik Sheba codebase. These rules help maintain consistency, security, and code quality across the project.

## Rule Files

### 00-project-overview.md
- Project description and technology stack
- Architecture patterns
- Key features and project structure

### 01-coding-standards.md
- PHP and Laravel coding standards
- Naming conventions
- Code style guidelines
- Documentation requirements

### 02-security-practices.md
- Input sanitization
- File upload security
- XSS protection
- SQL injection prevention
- Authentication and authorization

### 03-database-patterns.md
- Schema design
- Eloquent relationships
- Query patterns
- Migration guidelines
- JSON columns and soft deletes

### 04-frontend-patterns.md
- Blade template structure
- Component organization
- Tailwind CSS usage
- Alpine.js patterns
- View organization

### 05-api-patterns.md
- API route organization
- AJAX endpoints
- Response formats
- Rate limiting and CORS

### 06-testing-guidelines.md
- Testing framework setup
- Writing tests
- Test coverage guidelines
- Best practices

### 07-deployment-checklist.md
- Pre-deployment steps
- Server configuration
- Security checks
- Post-deployment verification

## How to Use

1. **Read the rules** before starting work on a new feature
2. **Follow the patterns** established in these rules
3. **Reference specific rules** when making architectural decisions
4. **Update rules** when patterns change or new patterns emerge

## Key Principles

1. **Controller → Service → Repository (CSR) Pattern**: Always follow this architecture
2. **Security First**: Always sanitize input, validate files, protect against XSS
3. **Code Quality**: Follow PSR-12, use type hints, write tests
4. **Performance**: Eager load relationships, use caching, optimize images
5. **Maintainability**: Write clean, documented, testable code

## Quick Reference

### Creating a New Feature

1. Create migration: `php artisan make:migration create_xxx_table`
2. Create model: `php artisan make:model Xxx`
3. Create repository interface: `app/Repositories/Interfaces/XxxRepositoryInterface.php`
4. Create repository: `app/Repositories/XxxRepository.php`
5. Create service: `app/Services/XxxService.php`
6. Create controller: `php artisan make:controller Admin/XxxController`
7. Create routes in `routes/web.php`
8. Create views in `resources/views/admin/xxx/`
9. Write tests in `tests/Feature/XxxTest.php`

### Common Patterns

#### Controller Pattern
```php
class XxxController extends Controller
{
    public function __construct(
        private XxxService $xxxService,
        private XxxRepositoryInterface $xxxRepository
    ) {}
}
```

#### Service Pattern
```php
class XxxService
{
    public function __construct(
        private XxxRepositoryInterface $xxxRepository
    ) {}
}
```

#### Repository Pattern
```php
class XxxRepository implements XxxRepositoryInterface
{
    // Data access methods
}
```

## Contributing

When adding new patterns or guidelines:

1. Update the relevant rule file
2. Add examples and code snippets
3. Update this README if needed
4. Document breaking changes

## Questions?

Refer to the specific rule file for detailed information, or check the main project documentation in `docs/`.

