# Testing Guidelines

## Testing Framework

### Pest PHP
- Use Pest PHP for testing
- Located in `tests/` directory
- Run tests with `php artisan test`

### Test Structure
```
tests/
├── Feature/          # Feature tests (HTTP, database)
├── Unit/             # Unit tests (isolated)
└── Browser/          # Browser tests (Dusk)
```

## Writing Tests

### Feature Tests
- Test HTTP endpoints
- Test database operations
- Test authentication and authorization

```php
use Tests\TestCase;
use App\Models\Listing;
use App\Models\User;

test('user can view listing', function () {
    $listing = Listing::factory()->create(['status' => 'approved']);
    
    $response = $this->get(route('listing.show', $listing->slug));
    
    $response->assertStatus(200);
    $response->assertSee($listing->title);
});

test('admin can approve listing', function () {
    $admin = User::factory()->admin()->create();
    $listing = Listing::factory()->create(['status' => 'pending']);
    
    $response = $this->actingAs($admin)
        ->post(route('admin.listings.approve', $listing));
    
    $response->assertRedirect();
    $this->assertDatabaseHas('listings', [
        'id' => $listing->id,
        'status' => 'approved'
    ]);
});
```

### Unit Tests
- Test individual methods
- Test helper functions
- Test service methods

```php
use App\Helpers\ImageHelper;
use Illuminate\Http\UploadedFile;

test('image helper validates file type', function () {
    $file = UploadedFile::fake()->image('test.jpg');
    
    $validation = \App\Helpers\FileValidationHelper::validateImage($file);
    
    expect($validation['valid'])->toBeTrue();
});

test('image helper rejects invalid file', function () {
    $file = UploadedFile::fake()->create('test.exe', 100);
    
    $validation = \App\Helpers\FileValidationHelper::validateImage($file);
    
    expect($validation['valid'])->toBeFalse();
});
```

### Database Tests
- Use database transactions
- Use factories for test data
- Clean up after tests

```php
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('listing repository gets by slug', function () {
    $listing = Listing::factory()->create(['slug' => 'test-listing']);
    
    $result = app(ListingRepository::class)->getBySlug('test-listing');
    
    expect($result)->not->toBeNull();
    expect($result->id)->toBe($listing->id);
});
```

## Test Coverage

### What to Test
- **Controllers**: HTTP responses, redirects, validation
- **Services**: Business logic, transactions, notifications
- **Repositories**: Query results, relationships
- **Helpers**: Function output, edge cases
- **Models**: Relationships, scopes, casts

### What Not to Test
- Laravel framework code
- Third-party package code
- Simple getters/setters
- View rendering (use browser tests)

## Test Data

### Factories
- Create factories for all models
- Use Faker for realistic data
- Define relationships in factories

```php
// database/factories/ListingFactory.php
Listing::factory()->define([
    'title' => fake()->sentence(),
    'slug' => fn($attrs) => Str::slug($attrs['title']),
    'status' => 'approved',
    'sub_category_id' => SubCategory::factory(),
]);
```

### Seeders
- Use seeders for development data
- Create test seeders separately
- Don't use production seeders in tests

## Running Tests

### Run All Tests
```bash
php artisan test
```

### Run Specific Test
```bash
php artisan test --filter test_name
```

### Run with Coverage
```bash
php artisan test --coverage
```

### Run Specific Suite
```bash
php artisan test --testsuite=Feature
php artisan test --testsuite=Unit
```

## Best Practices

### Test Naming
- Use descriptive test names
- Use `test()` function or `it()` helper
- Group related tests with `describe()`

```php
describe('Listing Service', function () {
    test('creates listing with slug', function () {
        // ...
    });
    
    test('approves listing and sends notification', function () {
        // ...
    });
});
```

### Arrange-Act-Assert
- Follow AAA pattern
- Arrange: Set up test data
- Act: Execute the code
- Assert: Verify results

```php
test('user can create listing', function () {
    // Arrange
    $user = User::factory()->create();
    $data = ['title' => 'Test Listing', ...];
    
    // Act
    $listing = $this->listingService->createListing($data, $user->id);
    
    // Assert
    expect($listing)->toBeInstanceOf(Listing::class);
    expect($listing->title)->toBe('Test Listing');
});
```

### Test Isolation
- Each test should be independent
- Don't rely on test execution order
- Clean up test data

### Mocking
- Mock external services
- Mock time-dependent code
- Use `Mockery` for complex mocks

```php
test('sends notification on approval', function () {
    Notification::fake();
    
    $listing = Listing::factory()->create();
    $this->listingService->approveListing($listing, 1);
    
    Notification::assertSentTo($listing->user, ListingApproved::class);
});
```

## Continuous Integration

### CI Configuration
- Run tests on every commit
- Run tests on pull requests
- Fail build on test failure

### Test Environment
- Use separate test database
- Use `.env.testing` for test configuration
- Don't use production data in tests

