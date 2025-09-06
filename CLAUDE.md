# Weekly Planner Project Instructions

## Project Overview
This is a role-based weekly planner web application built with HTML, CSS, and JavaScript. It helps users organize goals across different life roles and tracks completion throughout the week.

## Architecture
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase Firestore for data persistence
- **Hosting**: Firebase Hosting
- **Design**: Mobile-first responsive design with PWA capabilities

## Key Features
- **Role-based planning**: Individual, Husband, Father, Engineering Manager, etc.
- **Week navigation**: Browse different weeks with date picker
- **Goal management**: Add/remove goals, mark complete with checkboxes
- **Role editing**: Double-click to edit, right-click context menu for advanced options
- **Collapsible controls**: On-demand visibility for clean interface
- **Daily reminders**: Web Notifications API with in-page fallback
- **Week-independent goal columns**: Each week can have different numbers of goal columns
- **Real-time sync**: Firebase Firestore integration with offline fallback

## File Structure
- `index.html` - Main application structure with role-based table layout
- `styles.css` - Comprehensive responsive styling with mobile-first approach
- `script.js` - Core application logic, Firebase integration, and UI interactions
- `firebase-service.js` - Firebase Firestore service layer
- `firebase-config.js` - Firebase project configuration
- `firebase.json` - Firebase hosting configuration

## Development Guidelines
- **Mobile-first**: Always consider mobile experience first
- **Accessibility**: Maintain keyboard navigation and screen reader compatibility
- **Performance**: Use debounced saving and efficient DOM manipulation
- **Error handling**: Graceful fallbacks for Firebase and notification failures
- **User feedback**: Provide visual confirmation for all actions via in-page notifications

## Testing Commands
- `python3 -m http.server 3000` - Start local development server
- `firebase deploy --only hosting` - Deploy to Firebase Hosting
- Test on both desktop and mobile devices

## Code Style
- Use modern JavaScript features (async/await, destructuring, etc.)
- Maintain consistent indentation (4 spaces)
- Add descriptive comments for complex logic
- Use semantic HTML elements
- Follow mobile-first CSS approach

## Firebase Integration
- Real-time data synchronization with Firestore
- Week-based data storage structure
- Offline-capable with localStorage fallback
- Role structure templates for new weeks

## Recent Improvements
- Added comprehensive daily reminder system with Web Notifications API
- Implemented week-independent goal column configuration
- Enhanced role editing with context menus and color picker
- Created beautiful in-page notification system
- Optimized mobile experience with independent scrolling areas

## Common Tasks
- **Adding new features**: Always update both UI and data persistence layers
- **Mobile optimization**: Test thoroughly on actual mobile devices
- **Firebase changes**: Update both firebase-service.js and related UI code
- **Styling updates**: Maintain both desktop and mobile responsive breakpoints

## Deployment
- Repository: https://github.com/charithh/weekly_planner.git
- Live URL: [Firebase Hosting URL after deployment]
- Always commit changes before deploying

## Support
- Use in-page notifications for user feedback
- Maintain backward compatibility with existing Firebase data
- Graceful degradation when features aren't available (notifications, Firebase, etc.)