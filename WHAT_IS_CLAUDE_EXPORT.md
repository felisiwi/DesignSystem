# What Does `claude-export` Do? (Simple Explanation)

## The Simple Answer

**`claude-export` takes your latest chat notes and automatically adds them to your documentation, then saves everything to GitHub.**

## Step-by-Step (What It Actually Does)

1. **Finds** the newest session file in your component's folder
   - Looks in `notes/claude-sessions/[ComponentName]/`
   - Finds the most recently modified `.md` file (excluding MASTER files)
   - Example: `ThumbReachmapper_01_04112025.md`

2. **Reads** the session file and extracts key information
   - Gets the title
   - Gets bullet points/key points
   - Gets the date

3. **Creates** a summary snippet
   - Formats it nicely with the date and key points
   - Saves it as a temporary file

4. **Adds** it to the MASTER.md file
   - Inserts the snippet at the top of the "Session Integration Log" section
   - Places it above the "END OF MASTER DOCUMENTATION" marker
   - So your newest sessions appear at the top

5. **Saves** everything to GitHub
   - Commits the changes
   - Pushes to GitHub automatically

## Real-World Example

**Before:**
- You just finished a chat about ThumbReachMapper
- You saved the summary as `ThumbReachmapper_01_04112025.md`
- Your `Thumbreachmapper_MASTER.md` doesn't have this session yet

**You run:**
```powershell
claude-export ThumbReachMapper
```

**After:**
- The script finds `ThumbReachmapper_01_04112025.md`
- Creates a summary snippet
- Adds it to `Thumbreachmapper_MASTER.md`
- Commits and pushes to GitHub
- Your master documentation is now up-to-date!

## Why This Is Useful

- **Automatic**: No manual copy-pasting
- **Consistent**: Always formats summaries the same way
- **Organized**: Keeps your master docs up-to-date
- **Version Control**: Automatically commits to Git

## Three Ways to Use It

1. **Update all components at once:**
   ```powershell
   claude-export
   ```
   or
   ```powershell
   claude-export all
   ```

2. **Update one specific component:**
   ```powershell
   claude-export ThumbReachMapper
   claude-export Carousel
   ```

3. **That's it!** Just those two options.

## Think of It Like This

Imagine you write a journal entry every day, and you want to add it to your master journal. Instead of:
- Finding the right page
- Copying the entry
- Formatting it correctly
- Saving it

You just say "add today's entry" and it does all of that automatically!

