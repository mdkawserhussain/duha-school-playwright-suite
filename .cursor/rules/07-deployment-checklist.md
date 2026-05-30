# Deployment Checklist

## Pre-Deployment

### Code Review
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] No console errors or warnings
- [ ] No debug code left in production

### Environment Configuration
- [ ] `.env` file configured for production
- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false`
- [ ] `APP_URL` set to production domain
- [ ] Database credentials configured
- [ ] Mail configuration set up
- [ ] Queue connection configured
- [ ] Cache driver configured (Redis recommended)

### Dependencies
- [ ] Run `composer install --optimize-autoloader --no-dev`
- [ ] Run `npm install` and `npm run build`
- [ ] Check for security vulnerabilities: `composer audit`
- [ ] Update dependencies if needed

## Database

### Migrations
- [ ] All migrations run: `php artisan migrate --force`
- [ ] Database backed up before migration
- [ ] Seeders run if needed: `php artisan db:seed --class=ProductionSeeder`

### Database Optimization
- [ ] Indexes created for frequently queried columns
- [ ] Foreign key constraints in place
- [ ] Database optimized: `php artisan db:optimize`

## Application

### Cache
- [ ] Config cached: `php artisan config:cache`
- [ ] Route cached: `php artisan route:cache`
- [ ] View cached: `php artisan view:cache`
- [ ] Event cached: `php artisan event:cache`

### Optimization
- [ ] Autoloader optimized: `composer dump-autoload -o`
- [ ] Application optimized: `php artisan optimize`

### Storage
- [ ] Storage symlink created: `php artisan storage:link`
- [ ] Storage permissions set: `chmod -R 775 storage bootstrap/cache`
- [ ] Storage ownership set: `chown -R www-data:www-data storage bootstrap/cache`

## Server Configuration

### PHP Settings
- [ ] PHP version 8.2+ installed
- [ ] Required PHP extensions installed
- [ ] `upload_max_filesize` set appropriately
- [ ] `post_max_size` set appropriately
- [ ] `memory_limit` set to 256M or higher
- [ ] `max_execution_time` set appropriately

### Web Server
- [ ] Nginx/Apache configured
- [ ] Document root set to `public/`
- [ ] SSL certificate installed
- [ ] HTTPS redirect configured
- [ ] Gzip compression enabled

### Queue Workers
- [ ] Supervisor configured for queue workers
- [ ] Queue workers running
- [ ] Failed jobs table created: `php artisan queue:failed-table`

### Cron Jobs
- [ ] Scheduler configured: `* * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1`
- [ ] Log rotation configured

## Security

### File Permissions
- [ ] Storage writable: `chmod -R 775 storage`
- [ ] Bootstrap cache writable: `chmod -R 775 bootstrap/cache`
- [ ] `.env` file permissions: `chmod 600 .env`
- [ ] Sensitive files not publicly accessible

### Security Headers
- [ ] HTTPS enforced
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] CORS configured if needed

### Environment Variables
- [ ] All secrets in `.env` file
- [ ] `.env` file not committed to repository
- [ ] Production keys generated: `php artisan key:generate`

## Monitoring

### Logging
- [ ] Logging configured
- [ ] Log rotation set up
- [ ] Error tracking configured (Sentry, etc.)

### Performance
- [ ] Application performance monitoring set up
- [ ] Database query monitoring enabled
- [ ] Slow query log enabled

### Backups
- [ ] Database backup strategy in place
- [ ] File backup strategy in place
- [ ] Backup restoration tested

## Post-Deployment

### Verification
- [ ] Homepage loads correctly
- [ ] Admin panel accessible
- [ ] User registration works
- [ ] Listing submission works
- [ ] Search functionality works
- [ ] Image uploads work
- [ ] Email sending works
- [ ] Queue processing works

### Performance
- [ ] Page load times acceptable
- [ ] Database queries optimized
- [ ] Images optimized and loading
- [ ] CDN configured if used

### Monitoring
- [ ] Error logs checked
- [ ] Application logs checked
- [ ] Performance metrics reviewed
- [ ] User feedback collected

## Rollback Plan

### Preparation
- [ ] Previous version tagged in Git
- [ ] Database backup available
- [ ] Rollback procedure documented

### Execution
- [ ] Switch to previous Git tag
- [ ] Run migrations rollback if needed
- [ ] Restore database backup if needed
- [ ] Clear all caches
- [ ] Verify application works

## Maintenance

### Regular Tasks
- [ ] Update dependencies monthly
- [ ] Review and rotate logs weekly
- [ ] Check disk space regularly
- [ ] Monitor error rates daily
- [ ] Review security advisories

### Updates
- [ ] Test updates in staging first
- [ ] Backup before updates
- [ ] Follow deployment checklist
- [ ] Monitor after updates

