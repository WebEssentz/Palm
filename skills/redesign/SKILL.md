# Redesign Skill

## Overview

This skill is responsible for redesigning existing web pages to improve their visual design, user experience, and overall effectiveness. It takes an existing HTML page and transforms it into a modern, professional design while maintaining the original content and structure.

## Capabilities

- **Visual Redesign**: Transforms outdated or basic designs into modern, professional layouts
- **UX Improvement**: Enhances user experience through better information architecture and interaction design
- **Component Modernization**: Upgrades UI components to use current design patterns and libraries
- **Responsive Design**: Ensures the page works seamlessly across all devices
- **Accessibility Enhancement**: Improves accessibility through proper ARIA attributes and semantic HTML
- **Content Preservation**: Maintains the original content while improving the presentation

## Inputs

- **HTML Content**: The existing HTML code of the page to redesign
- **Style Guide**: Color palette, typography, spacing, and component styles
- **Inspiration Images**: Reference images to guide the design direction
- **Page Type**: Contextual information about the page's purpose (e.g., landing page, dashboard, e-commerce)

## Outputs

- **Redesigned HTML**: The improved HTML code with modern design
- **CSS/Tailwind Classes**: Updated styling using Tailwind CSS
- **Component Updates**: Modernized UI components (buttons, cards, forms, navigation, etc.)
- **Layout Improvements**: Better information hierarchy and visual flow
- **Accessibility Enhancements**: ARIA labels, semantic HTML, focus management

## Design Principles

1. **Modern Aesthetics**: Use current design trends, clean layouts, and appropriate whitespace
2. **User-Centric Design**: Prioritize user experience, ease of navigation, and task completion
3. **Brand Consistency**: Maintain the brand's color palette, typography, and overall style
4. **Responsive First**: Design for mobile, tablet, and desktop breakpoints
5. **Accessibility**: Follow WCAG guidelines for inclusive design
6. **Performance**: Optimize for fast loading times and smooth interactions

## Workflow

1. **Analyze Input**: Understand the current page structure, content, and design
2. **Apply Style Guide**: Extract and apply color palette, typography, and spacing rules
3. **Modernize Layout**: Restructure the page for better visual hierarchy and user flow
4. **Component Upgrade**: Replace outdated components with modern equivalents
5. **Responsive Implementation**: Add media queries and responsive utilities
6. **Accessibility Audit**: Ensure proper ARIA attributes and semantic HTML
7. **Content Integration**: Place content in the new layout appropriately
8. **Final Review**: Validate the design against requirements and best practices

## Technical Implementation

- **Framework**: Tailwind CSS for utility-first styling
- **Components**: Shadcn/ui patterns for modern components
- **Structure**: Semantic HTML5 with proper ARIA roles
- **Responsiveness**: Mobile-first approach with breakpoint utilities
- **Animation**: Subtle transitions and micro-interactions for better UX

## Examples

### Before Redesign
```html
<div style="background-color: #f0f0f0; padding: 20px;">
  <h1 style="color: #333;">Welcome</h1>
  <p style="color: #666;">This is an old design.</p>
  <button style="background-color: #007bff; color: white; padding: 10px;">Click Me</button>
</div>
```

### After Redesign
```html
<div class="bg-background p-6 rounded-lg shadow-sm">
  <h1 class="text-3xl font-bold text-foreground mb-4">Welcome</h1>
  <p class="text-muted-foreground mb-6">This is a modern, professional design.</p>
  <button class="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors">
    Click Me
  </button>
</div>
```

## Best Practices

- Always maintain the original content unless explicitly asked to change it
- Use the provided style guide for colors, typography, and spacing
- Ensure the page is fully responsive and works on mobile devices
- Add ARIA labels and semantic HTML for accessibility
- Use Tailwind CSS classes instead of inline styles
- Keep the design consistent with the overall application style
- Optimize for performance and fast loading times

## Troubleshooting

- **Design doesn't match style guide**: Verify style guide colors and typography are applied correctly
- **Layout is broken**: Check for responsive issues and proper container usage
- **Components look outdated**: Ensure Shadcn/ui patterns are used for modern components
- **Accessibility issues**: Add ARIA labels and semantic HTML where needed
- **Content is missing**: Verify all content from the original page is preserved

## Notes

- This skill should be used when an existing page needs a visual refresh
- It preserves the functionality while improving the design
- The output should be production-ready HTML with Tailwind CSS classes
- The design should be consistent with the application's overall style guide
