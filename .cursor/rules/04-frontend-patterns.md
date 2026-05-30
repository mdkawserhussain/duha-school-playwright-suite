# Frontend Patterns

## Blade Templates

### Layout Structure

#### Admin Layout
- Use `x-admin-layout` component for admin pages
- Located in `resources/views/components/admin-layout.blade.php`
- Includes admin sidebar, header, and footer

```blade
<x-admin-layout>
    <x-slot name="title">Page Title</x-slot>
    
    {{-- Page content --}}
</x-admin-layout>
```

#### Frontend Layout
- Use `x-app-layout` component for public pages
- Located in `resources/views/components/app-layout.blade.php`
- Includes public header, navigation, and footer

```blade
<x-app-layout>
    {{-- Page content --}}
</x-app-layout>
```

### Component Organization

#### Reusable Components
- Create components in `resources/views/components/`
- Use `x-` prefix for Blade components
- Organize by feature: `admin/`, `frontend/`

```blade
{{-- resources/views/components/listing-card.blade.php --}}
<div class="listing-card">
    <x-optimized-image :src="$listing->image" :alt="$listing->title" />
    <h3>{{ $listing->title }}</h3>
</div>

{{-- Usage --}}
<x-listing-card :listing="$listing" />
```

### Image Components

#### Optimized Image Component
- Always use `x-optimized-image` for images
- Automatically handles WebP conversion and lazy loading
- Located in `resources/views/components/optimized-image.blade.php`

```blade
<x-optimized-image 
    :src="$listing->image" 
    :alt="$listing->title"
    class="w-full h-48 object-cover"
/>
```

#### Responsive Image Component
- Use `x-responsive-image` for responsive images with srcset
- Supports multiple breakpoints
- Located in `resources/views/components/responsive-image.blade.php`

### Form Components

#### Form Structure
- Use `x-form` component for consistent form styling
- Include CSRF token with `@csrf`
- Use `@method('PUT')` for PUT/PATCH requests

```blade
<x-form action="{{ route('listings.store') }}" method="POST">
    @csrf
    
    <x-form-group>
        <x-label for="title">Title</x-label>
        <x-input id="title" name="title" value="{{ old('title') }}" />
        <x-error name="title" />
    </x-form-group>
    
    <x-button type="submit">Save</x-button>
</x-form>
```

### Error Display

#### Error Messages
- Use `x-error` component for field errors
- Display validation errors automatically
- Show flash messages with `x-alert` component

```blade
<x-error name="title" />

@if (session('success'))
    <x-alert type="success">{{ session('success') }}</x-alert>
@endif
```

## Tailwind CSS

### Utility Classes
- Use Tailwind utility classes for styling
- Follow mobile-first approach
- Use responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

```blade
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {{-- Cards --}}
</div>
```

### Custom Components
- Create reusable component classes in `resources/css/`
- Use `@apply` directive for component extraction
- Maintain consistency across the application

```css
.btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700;
}
```

## Alpine.js

### Component Structure
- Use Alpine.js for interactive components
- Keep JavaScript minimal and focused
- Use `x-data` for component state

```blade
<div x-data="{ open: false }">
    <button @click="open = !open">Toggle</button>
    <div x-show="open">Content</div>
</div>
```

### Event Handling
- Use `@click`, `@submit`, `@change` for events
- Use `x-on:` for dynamic event names
- Prevent default with `.prevent` modifier

```blade
<form @submit.prevent="submitForm">
    <input @change="handleChange" />
</form>
```

### AJAX Requests
- Use `fetch()` or `axios` for AJAX
- Show loading states
- Handle errors gracefully

```blade
<div x-data="{
    loading: false,
    async loadData() {
        this.loading = true;
        try {
            const response = await fetch('/api/data');
            const data = await response.json();
            // Handle data
        } catch (error) {
            // Handle error
        } finally {
            this.loading = false;
        }
    }
}">
    <button @click="loadData" :disabled="loading">
        <span x-show="loading">Loading...</span>
        <span x-show="!loading">Load</span>
    </button>
</div>
```

## View Organization

### Directory Structure
```
resources/views/
├── admin/              # Admin panel views
│   ├── listings/
│   ├── categories/
│   └── dashboard/
├── frontend/           # Public views
│   ├── listing/
│   ├── doctor/
│   └── search/
└── components/         # Reusable components
    ├── admin/
    └── frontend/
```

### View Naming
- Use kebab-case for view files
- Match controller method names
- Use descriptive names: `index.blade.php`, `create.blade.php`, `show.blade.php`

### Passing Data to Views
- Use `compact()` for multiple variables
- Use `view()->with()` for single variables
- Pass collections and models directly

```php
return view('admin.listings.index', compact('listings', 'categories'));

// Or
return view('admin.listings.index')
    ->with('listings', $listings)
    ->with('categories', $categories);
```

## Conditional Rendering

### Category-Specific Content
- Use conditional rendering based on sub-category
- Check sub-category name or slug
- Render different sections for different categories

```blade
@if(str_contains($listing->subCategory->name, 'ডাক্তার'))
    {{-- Doctor-specific content --}}
    <x-doctor-info :doctor="$listing->doctor" />
@elseif(str_contains($listing->subCategory->name, 'রেস্টুরেন্ট'))
    {{-- Restaurant-specific content --}}
    <x-restaurant-menu :menu="$listing->meta_data['menu'] ?? []" />
@endif
```

## Localization

### Language Support
- Primary language: Bengali (Bangla)
- Use Bangla text in views
- Store translations in `resources/lang/` if needed

### Date Formatting
- Use Carbon for date formatting
- Format dates in Bangla style when needed
- Use `format()` method for custom formats

```blade
{{ $listing->created_at->format('d M Y') }}
{{ $listing->created_at->diffForHumans() }}
```

## Performance

### Lazy Loading
- Use `loading="lazy"` for images below the fold
- Implement infinite scroll for long lists
- Defer non-critical JavaScript

### Caching
- Cache expensive queries
- Use Blade `@cache` directive for static content
- Cache API responses when appropriate

```blade
@cache('listing-' . $listing->id)
    {{-- Expensive content --}}
@endcache
```

## Accessibility

### Semantic HTML
- Use semantic HTML elements
- Include proper ARIA labels
- Ensure keyboard navigation

### Alt Text
- Always include alt text for images
- Use descriptive alt text
- Don't use "image" or "picture" in alt text

```blade
<img src="{{ $image }}" alt="{{ $listing->title }}" />
```

### Form Labels
- Always associate labels with inputs
- Use `for` attribute on labels
- Use `id` attribute on inputs

```blade
<label for="title">Title</label>
<input id="title" name="title" />
```

