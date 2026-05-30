# API Patterns

## API Routes

### Route Organization
- API routes in `routes/api.php`
- Use `api` prefix (automatic)
- Use versioning if needed: `/api/v1/`

```php
Route::prefix('api')->group(function () {
    Route::get('/upazilas', [BloodDonorController::class, 'getUpazilas']);
});
```

### Response Format
- Return JSON responses
- Use consistent response structure
- Include status codes

```php
return response()->json([
    'success' => true,
    'data' => $upazilas,
    'message' => 'Upazilas retrieved successfully'
], 200);
```

## AJAX Endpoints

### Dynamic Data Loading
- Create endpoints for dynamic content
- Use for dropdowns, filters, search
- Return JSON data

```php
public function getUpazilas(Request $request)
{
    $district = $request->get('district');
    
    if (!$district) {
        return response()->json(['data' => []], 200);
    }
    
    $upazilas = BloodDonor::where('district', $district)
        ->distinct()
        ->pluck('upazila')
        ->filter()
        ->sort()
        ->values();
    
    return response()->json(['data' => $upazilas], 200);
}
```

### Frontend Usage
- Use `fetch()` or `axios` for AJAX calls
- Handle loading and error states
- Update UI dynamically

```javascript
async function loadUpazilas(district) {
    try {
        const response = await fetch(`/api/upazilas?district=${district}`);
        const data = await response.json();
        // Update dropdown with data.data
    } catch (error) {
        console.error('Error loading upazilas:', error);
    }
}
```

## Validation

### Request Validation
- Validate API requests
- Return validation errors in consistent format
- Use form request classes for complex validation

```php
$validated = $request->validate([
    'district' => 'required|string|max:255',
]);

// Or use Form Request
class GetUpazilasRequest extends FormRequest
{
    public function rules()
    {
        return [
            'district' => 'required|string|max:255',
        ];
    }
}
```

### Error Responses
- Return consistent error format
- Include error messages
- Use appropriate HTTP status codes

```php
return response()->json([
    'success' => false,
    'message' => 'Validation failed',
    'errors' => $validator->errors()
], 422);
```

## Rate Limiting

### API Rate Limiting
- Apply rate limiting to API endpoints
- Use `throttle` middleware
- Configure limits per endpoint

```php
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/api/upazilas', [BloodDonorController::class, 'getUpazilas']);
});
```

## CORS

### Cross-Origin Requests
- Configure CORS in `config/cors.php`
- Allow specific origins
- Set appropriate headers

```php
'allowed_origins' => [
    'https://example.com',
],
```

## Search API

### Search Endpoints
- Create dedicated search endpoints
- Support filtering and pagination
- Return structured results

```php
public function search(Request $request)
{
    $query = $request->get('q');
    $filters = $request->only(['category', 'district', 'upazila']);
    
    $results = $this->searchService->search($query, $filters);
    
    return response()->json([
        'success' => true,
        'data' => $results->items(),
        'meta' => [
            'total' => $results->total(),
            'per_page' => $results->perPage(),
            'current_page' => $results->currentPage(),
        ]
    ]);
}
```

## File Upload API

### Image Upload
- Validate files before processing
- Use `FileValidationHelper`
- Return file path or URL

```php
public function uploadImage(Request $request)
{
    $request->validate([
        'image' => 'required|image|max:5120',
    ]);
    
    $validation = FileValidationHelper::validateImage($request->file('image'));
    if (!$validation['valid']) {
        return response()->json([
            'success' => false,
            'message' => $validation['error']
        ], 422);
    }
    
    $path = ImageHelper::uploadAndOptimize($request->file('image'));
    
    return response()->json([
        'success' => true,
        'data' => [
            'path' => $path,
            'url' => Storage::url($path)
        ]
    ]);
}
```

## Response Caching

### Cache API Responses
- Cache expensive API calls
- Use Laravel cache
- Set appropriate TTL

```php
return Cache::remember("upazilas-{$district}", 3600, function () use ($district) {
    return BloodDonor::where('district', $district)
        ->distinct()
        ->pluck('upazila')
        ->filter()
        ->sort()
        ->values();
});
```

## API Documentation

### Document Endpoints
- Document all API endpoints
- Include request/response examples
- Specify required parameters

```php
/**
 * Get upazilas by district
 * 
 * @param Request $request
 * @queryParam district string required District name
 * @return \Illuminate\Http\JsonResponse
 */
public function getUpazilas(Request $request)
{
    // ...
}
```

