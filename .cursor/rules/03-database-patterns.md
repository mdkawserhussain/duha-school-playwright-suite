# Database Patterns

## Schema Design

### Three-Level Category Hierarchy

The system uses a hierarchical category structure:

```
super_categories (1) → categories (N) → sub_categories (N) → listings (N)
```

#### Super Categories
- Top-level categories (e.g., "স্বাস্থ্য সেবা", "যানবাহন")
- Fields: `id`, `name`, `slug`, `order`, `active`, `timestamps`

#### Categories
- Main categories under super categories
- Fields: `id`, `super_category_id`, `name`, `slug`, `icon`, `order`, `active`, `timestamps`

#### Sub Categories
- Child categories under main categories
- Fields: `id`, `category_id`, `name`, `slug`, `description`, `active`, `timestamps`

### Listings Table

Core listings table with flexible structure:

```php
// Key fields
- id
- sub_category_id (FK to sub_categories)
- user_id (FK to users, nullable)
- title
- slug (unique)
- description (text)
- image (string, path)
- address, district, upazila
- phone, phone_2, email, website, facebook
- map_link, lat, lng
- meta_data (JSON) - for category-specific fields
- status (enum: draft, pending, approved, rejected)
- approved_by (FK to users, nullable)
- is_featured (boolean)
- view_count (integer)
- timestamps, deleted_at (soft deletes)
```

### Specialized Tables

#### Doctors
- Linked to listings via `listing_id`
- Fields: `specialty`, `qualification`, `workplace`, `treatments` (JSON), `chamber_info`, `visiting_schedule` (JSON), `bio`, `experience`, `bmdc_registration`

#### Blood Donors
- Standalone table (not linked to listings)
- Fields: `name`, `blood_group`, `phone`, `phone_2`, `address`, `district`, `upazila`, `last_donation_date`, `next_available_date`, `donation_count`, `is_active`, `is_available`

#### Appointments
- Links users to listings (doctors)
- Fields: `user_id`, `listing_id`, `patient_name`, `patient_phone`, `patient_email`, `appointment_date`, `appointment_time`, `serial_number`, `symptoms`, `status` (enum: pending, confirmed, cancelled, completed), `notes`

## Eloquent Relationships

### Listing Relationships

```php
class Listing extends Model
{
    // Belongs to
    public function subCategory(): BelongsTo
    {
        return $this->belongsTo(SubCategory::class);
    }
    
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    
    // Has one
    public function doctor()
    {
        return $this->hasOne(Doctor::class, 'listing_id');
    }
    
    // Has many
    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'listing_id');
    }
    
    // Morph many
    public function media(): MorphMany
    {
        return $this->morphMany(Media::class, 'mediable');
    }
}
```

### Category Relationships

```php
class SubCategory extends Model
{
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
    
    public function listings(): HasMany
    {
        return $this->hasMany(Listing::class);
    }
}

class Category extends Model
{
    public function superCategory(): BelongsTo
    {
        return $this->belongsTo(SuperCategory::class);
    }
    
    public function subCategories(): HasMany
    {
        return $this->hasMany(SubCategory::class);
    }
}
```

## Query Patterns

### Eager Loading
- Always eager load relationships to prevent N+1 queries
- Use `with()` for relationships
- Use `withCount()` for counting related models

```php
// ✅ Good: Eager loading
$listings = Listing::with(['subCategory.category.superCategory', 'user', 'media'])
    ->approved()
    ->get();

// ❌ Bad: N+1 queries
$listings = Listing::approved()->get();
foreach ($listings as $listing) {
    echo $listing->subCategory->name; // N+1 query
}
```

### Query Scopes
- Use scopes for reusable query constraints
- Define scopes in models
- Chain scopes for complex queries

```php
// In Model
public function scopeApproved($query)
{
    return $query->where('status', 'approved');
}

public function scopeFeatured($query)
{
    return $query->where('is_featured', true);
}

// Usage
$listings = Listing::approved()->featured()->get();
```

### Filtering
- Use query builders for dynamic filtering
- Apply filters conditionally
- Use `whereHas` for relationship filtering

```php
$query = Listing::query()->approved();

if ($request->has('district')) {
    $query->where('district', $request->district);
}

if ($request->has('category_id')) {
    $query->whereHas('subCategory', function($q) use ($request) {
        $q->where('category_id', $request->category_id);
    });
}

$listings = $query->paginate(15);
```

## Migrations

### Naming Convention
- Use descriptive names: `create_listings_table`, `add_meta_data_to_listings_table`
- Use timestamps: `2024_01_01_000000_create_listings_table.php`

### Migration Structure
- Use `Schema::create()` for new tables
- Use `Schema::table()` for modifications
- Always add indexes for foreign keys
- Use `$table->softDeletes()` for soft deletes

```php
Schema::create('listings', function (Blueprint $table) {
    $table->id();
    $table->foreignId('sub_category_id')->constrained()->onDelete('cascade');
    $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
    $table->string('title');
    $table->string('slug')->unique();
    $table->text('description')->nullable();
    $table->string('image')->nullable();
    $table->json('meta_data')->nullable();
    $table->enum('status', ['draft', 'pending', 'approved', 'rejected'])->default('pending');
    $table->boolean('is_featured')->default(false);
    $table->integer('view_count')->default(0);
    $table->timestamps();
    $table->softDeletes();
    
    $table->index('slug');
    $table->index('status');
    $table->index('is_featured');
});
```

## JSON Columns

### Using JSON Columns
- Use JSON for flexible, category-specific data
- Cast JSON columns in models
- Validate JSON structure when needed

```php
// Migration
$table->json('meta_data')->nullable();

// Model
protected $casts = [
    'meta_data' => 'array',
];

// Usage
$listing->meta_data = ['menu' => [...], 'opening_hours' => [...]];
$listing->save();
```

## Soft Deletes

### Implementation
- Use soft deletes for important records
- Add `deleted_at` column
- Use `SoftDeletes` trait in models

```php
use Illuminate\Database\Eloquent\SoftDeletes;

class Listing extends Model
{
    use SoftDeletes;
    
    // ...
}

// Query only non-deleted
$listings = Listing::all();

// Include deleted
$listings = Listing::withTrashed()->get();

// Only deleted
$listings = Listing::onlyTrashed()->get();
```

## Indexes

### When to Add Indexes
- Foreign keys (automatic in Laravel)
- Frequently queried columns (status, slug, is_featured)
- Search columns (title, description)
- Composite indexes for common query patterns

```php
$table->index(['status', 'is_featured']);
$table->index(['district', 'upazila']);
```

## Transactions

### Use Transactions
- Wrap multiple database operations in transactions
- Use `DB::transaction()` for automatic rollback
- Use `DB::beginTransaction()` for manual control

```php
DB::transaction(function () {
    $listing = Listing::create([...]);
    $listing->media()->create([...]);
    $this->activityLogService->log(...);
});
```

