# Security Practices

## Input Sanitization

### Always Sanitize User Input
- Use `SanitizationHelper` for all user-provided content
- Sanitize HTML content before storing
- Sanitize text fields to prevent XSS
- Sanitize URLs and emails

```php
use App\Helpers\SanitizationHelper;

// HTML content (with basic HTML allowed)
$description = SanitizationHelper::sanitizeHtml($request->description, true);

// Plain text
$title = SanitizationHelper::sanitizeText($request->title);

// URLs
$website = SanitizationHelper::sanitizeUrl($request->website);

// Emails
$email = SanitizationHelper::sanitizeEmail($request->email);
```

### Validation Rules
- Always validate user input using Laravel's validation
- Use form request classes for complex validation
- Validate file uploads with `FileValidationHelper`

```php
$validated = $request->validate([
    'title' => 'required|string|max:255',
    'email' => 'nullable|email',
    'website' => 'nullable|url',
    'image' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120',
]);
```

## File Upload Security

### File Validation
- Always use `FileValidationHelper` before processing files
- Validate MIME type, extension, and magic numbers
- Check file size limits from `config/file_limits.php`
- Scan for malicious content

```php
use App\Helpers\FileValidationHelper;

$validation = FileValidationHelper::validateImage($file);
if (!$validation['valid']) {
    return back()->withErrors(['image' => $validation['error']]);
}

// Proceed with upload
$path = ImageHelper::uploadAndOptimize($file);
```

### File Size Limits
- Images: 5MB maximum
- Documents: 10MB maximum
- Videos: 50MB maximum
- Audio: 10MB maximum

### Allowed File Types
- Images: jpeg, jpg, png, gif, webp, svg
- Documents: pdf, doc, docx, xls, xlsx

### Image Processing
- All images are automatically converted to WebP
- Original files are deleted after conversion
- Images are optimized and resized

## XSS Protection

### HTML Sanitization
- Strip dangerous HTML tags (script, iframe, embed, object)
- Remove JavaScript event handlers (onclick, onerror, etc.)
- Remove dangerous protocols (javascript:, data:, vbscript:)
- Allow only safe HTML tags and attributes

### Output Escaping
- Use Blade's `{{ }}` for automatic escaping
- Use `{!! !!}` only when necessary and content is sanitized
- Never output unsanitized user content

```blade
{{-- Safe: Automatic escaping --}}
{{ $listing->title }}

{{-- Dangerous: Only use if content is sanitized --}}
{!! $listing->description !!}
```

## SQL Injection Prevention

### Use Eloquent ORM
- Always use Eloquent models and query builders
- Never use raw SQL with user input
- Use parameter binding for raw queries

```php
// ✅ Good: Eloquent
Listing::where('slug', $slug)->first();

// ✅ Good: Query Builder with binding
DB::select('SELECT * FROM listings WHERE slug = ?', [$slug]);

// ❌ Bad: Raw SQL with concatenation
DB::select("SELECT * FROM listings WHERE slug = '{$slug}'");
```

## Authentication & Authorization

### Middleware
- Use `auth` middleware for authenticated routes
- Use `admin` middleware for admin routes
- Check permissions using Spatie Permission

```php
Route::middleware('auth')->group(function () {
    Route::get('/profile', [UserController::class, 'profile']);
});

Route::middleware('admin')->group(function () {
    Route::get('/admin', [DashboardController::class, 'index']);
});
```

### Authorization
- Use policies for resource authorization
- Check permissions before sensitive operations
- Log admin actions using `ActivityLogService`

```php
$this->authorize('update', $listing);

// Or check permissions directly
if (!auth()->user()->can('approve listings')) {
    abort(403);
}
```

## CSRF Protection

### Forms
- Always include `@csrf` in forms
- Use `@method('PUT')` for PUT/PATCH requests
- Verify CSRF token in API routes if needed

```blade
<form method="POST" action="{{ route('listings.store') }}">
    @csrf
    {{-- Form fields --}}
</form>
```

## Password Security

### Hashing
- Laravel automatically hashes passwords using bcrypt
- Never store plain text passwords
- Use `Hash::make()` for manual hashing

### Password Requirements
- Minimum 8 characters
- Enforce strong passwords in production

## Rate Limiting

### API Routes
- Use rate limiting for API endpoints
- Use rate limiting for login attempts
- Configure in `app/Http/Kernel.php`

```php
Route::middleware('throttle:60,1')->group(function () {
    // API routes
});
```

## Activity Logging

### Log Admin Actions
- Log all admin actions using `ActivityLogService`
- Include user, action, and resource information
- Store in `activity_logs` table

```php
$this->activityLogService->log(
    auth()->id(),
    'listing.approved',
    ['listing_id' => $listing->id]
);
```

## Security Headers

### Content Security Policy
- Configure CSP headers in middleware
- Prevent XSS attacks
- Restrict resource loading

### HTTPS
- Force HTTPS in production
- Use secure cookies
- Configure in `.env`: `APP_URL=https://...`

## Best Practices

1. **Never trust user input** - Always validate and sanitize
2. **Use prepared statements** - Always use Eloquent or query builders
3. **Keep dependencies updated** - Regularly update Composer packages
4. **Use environment variables** - Never commit secrets
5. **Enable logging** - Log security-related events
6. **Regular security audits** - Review code for vulnerabilities
7. **Use HTTPS** - Always use HTTPS in production
8. **Implement rate limiting** - Prevent abuse and brute force attacks

