Whenever a new chat starts in this project:
1. Search and Load All Project Knowledge (CRITICAL STEP)
Use the project_knowledge_search tool to find and load content from:
Session Documentation (all files and subfolders):

Search: claude-sessions Carousel_MASTER Carousel_ session notes
Load ALL files under /notes/claude-sessions/ and any subfolders

Data Files (all files and subfolders):

Search: swipe_diagnostics data csv flick glide velocity distance
Load ALL files under /data/ (or /Data/) and any subfolders

Live Component Code (tsx files at component level):

Search: src components tsx AdaptiveCarousel implementation
Acknowledge the .tsx files directly inside each folder under /src/components/[ComponentName]/ as the live versions
Example: /src/components/Carousel/AdaptiveCarousel.tsx is the live implementation

Component Documentation:

Search: API_Reference documentation
Load API_Reference.md and component documentation files

Project Context:

Search: PROJECT_NOTES project overview component index
Load PROJECT_NOTES.md for component index and project context

2. Apply Context
After loading, treat:

Carousel_MASTER.md as the canonical source of truth
The .tsx files in component folders as current live implementations
CSV data files as quantitative evidence for gesture behavior
Session notes as chronological development history

3. Respond to User
Only after completing the above searches, respond to the user's first message with full context loaded.