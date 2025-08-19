# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Jekyll-based e-commerce toy store website template. The site uses Jekyll collections for managing products and includes a shopping cart implementation with local storage.

## Development Commands

### Local Development
```bash
# Install dependencies
bundle install

# Run Jekyll development server
bundle exec jekyll serve

# Build the site for production
bundle exec jekyll build
```

The development server runs on http://localhost:4000 by default.

## Architecture

### Core Technologies
- **Jekyll 4.2.2**: Static site generator
- **Bootstrap 5.2.0**: CSS framework for styling
- **cart-localstorage**: Shopping cart state management
- **Google Tag Manager**: Analytics tracking (GTM-WWKRQF75)
- **VWO**: A/B testing integration

### Project Structure

#### Jekyll Configuration
- `_config.yml`: Jekyll site configuration with products collection setup
- Products are managed as a Jekyll collection with output enabled
- Default layout for products is "product"

#### Content Structure
- `_products/`: Product markdown files with frontmatter (identifier, name, price, image, title)
- `_layouts/`: HTML templates (default.html, product.html)
- `_includes/`: Reusable components (header.html, product-definition.html)
- `index.markdown`: Homepage displaying all products in a grid

#### Frontend Implementation
- `assets/javascript/index.js`: Shopping cart functionality, event tracking, and UI interactions
  - Cart operations: add/remove items, quantity management
  - DataLayer events for GTM tracking
  - Modal management for cart display
  - Card hover effects
- `assets/main.css`: Custom styles
- `assets/images/`: Product images and icons

#### Key Features
- Shopping cart with local storage persistence using cartLS library
- GTM integration for tracking user interactions (addToCart, removeCartItem, checkout)
- Product listing with card-based layout
- Modal-based cart view with quantity controls
- Contact form with analytics tracking

### Product Data Structure
Products use Jekyll frontmatter with:
- `identifier`: Unique product ID
- `name`: Product display name
- `price`: Numeric price value
- `image`: Path to product image
- `title`: Page title for SEO

### Analytics Implementation
The site uses window.dataLayer for GTM events:
- Product interactions (add/remove from cart)
- Checkout flow tracking
- Contact form submissions
- Cart state changes

## Important Notes

- The site depends on external CDNs for Bootstrap and cart-localstorage
- GTM and VWO scripts are loaded in the document head
- JavaScript runs on all pages via default layout
- Product URLs are generated automatically by Jekyll based on filename