# Coding Standards

## PHP Standards

### PSR Compliance
- Follow **PSR-12** coding standard
- Use **PSR-4** autoloading
- Use **PSR-1** basic coding standard

### Code Style
- Use **Laravel Pint** for code formatting
- Run `./vendor/bin/pint` before committing
- Use **strict types** where appropriate: `declare(strict_types=1);`

### Naming Conventions

#### Classes
- **Controllers**: `PascalCase` with `Controller` suffix
  - Example: `ListingController`, `Admin\DoctorController`
- **Models**: `PascalCase`, singular
  - Example: `Listing`, `BloodDonor`, `Appointment`
- **Services**: `PascalCase` with `Service` suffix
  - Example: `ListingService`, `ActivityLogService`
- **Repositories**: `PascalCase` with `Repository` suffix
  - Example: `ListingRepository`, `CategoryRepository`
- **Helpers**: `PascalCase` with `Helper` suffix
  - Example: `ImageHelper`, `SanitizationHelper`

#### Methods
- Use **camelCase** for methods
- Use descriptive names: `getBySlug()`, `approveListing()`, `recordDonation()`
- Boolean methods should start with `is`, `has`, `can`: `isApproved()`, `hasMedia()`

#### Variables
- Use **camelCase** for variables
- Use descriptive names: `$listingService`, `$approvedListings`
- Avoid abbreviations unless widely understood

#### Constants
- Use **UPPER_SNAKE_CASE** for constants
- Example: `MAX_FILE_SIZE`, `DEFAULT_PAGE_SIZE`

### Type Hints
- Always use type hints for method parameters and return types
- Use nullable types (`?string`, `?int`) when values can be null
- Use union types when appropriate: `string|int`

```php
public function createListing(array $data, ?int $userId = null): Listing
{
    // ...
}
```

### DocBlocks
- Use PHPDoc for all public methods
- Document parameters with `@param`
- Document return types with `@return`
- Document exceptions with `@throws`

```php
/**
 * Create a new listing
 *
 * @param array $data Listing data
 * @param int|null $userId User ID who created the listing
 * @return Listing
 * @throws \InvalidArgumentException
 */
public function createListing(array $data, ?int $userId = null): Listing
```

## Laravel Conventions

### Controllers
- Keep controllers thin - delegate to services
- Use dependency injection in constructor
- Return views with `compact()` or `view()->with()`
- Use resource controllers for CRUD operations

```php
class ListingController extends Controller
{
    public function __construct(
        private ListingService $listingService,
        private ListingRepositoryInterface $listingRepository
    ) {}

    public function store(Request $request)
    {
        $validated = $request->validate([...]);
        $listing = $this->listingService->createListing($validated, auth()->id());
        return redirect()->route('admin.listings.index');
    }
}
```

### Models
- Use `$fillable` for mass assignment protection
- Use `$casts` for type casting (arrays, dates, booleans)
- Define relationships as methods
- Use query scopes for reusable queries

```php
class Listing extends Model
{
    protected $fillable = ['title', 'slug', 'description', ...];
    
    protected $casts = [
        'meta_data' => 'array',
        'is_featured' => 'boolean',
    ];
    
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }
}
```

### Services
- Services contain business logic
- Services can call repositories and other services
- Services handle transactions when needed
- Services send notifications

```php
class ListingService
{
    public function __construct(
        private ListingRepositoryInterface $listingRepository
    ) {}

    public function approveListing(Listing $listing, int $approvedBy): bool
    {
        DB::transaction(function () use ($listing, $approvedBy) {
            $this->listingRepository->approve($listing, $approvedBy);
            if ($listing->user) {
                $listing->user->notify(new ListingApproved($listing));
            }
        });
    }
}
```

### Repositories
- Repositories handle all database queries
- Repositories implement interfaces
- Repositories return models or collections
- Use query builders for complex queries

```php
class ListingRepository implements ListingRepositoryInterface
{
    public function getBySlug(string $slug): ?Listing
    {
        return Listing::with(['subCategory', 'user', 'media'])
            ->where('slug', $slug)
            ->approved()
            ->first();
    }
}
```

## File Organization

### Directory Structure
- Controllers: `app/Http/Controllers/{Admin|Frontend|Auth}/`
- Models: `app/Models/`
- Services: `app/Services/`
- Repositories: `app/Repositories/` with `Interfaces/` subdirectory
- Helpers: `app/Helpers/`
- Views: `resources/views/{admin|frontend|components}/`

### File Naming
- One class per file
- File name matches class name
- Use namespace directories for organization

## Error Handling

- Use exceptions for error conditions
- Return appropriate HTTP status codes
- Log errors with context
- Provide user-friendly error messages

```php
if (!$listing) {
    abort(404, 'Listing not found');
}

try {
    $image = ImageHelper::uploadAndOptimize($file);
} catch (\InvalidArgumentException $e) {
    return back()->withErrors(['image' => $e->getMessage()]);
}
```

