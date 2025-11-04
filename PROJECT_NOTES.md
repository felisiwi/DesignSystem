# Project Notes

This document contains links to detailed documentation and notes for all components in the DesignSystem project.

---

## Components

### Carousel

A sophisticated, gesture-driven carousel component built with React and Framer Motion.

**Master Overview**: [Carousel_MASTER.md](./notes/claude-sessions/Carousel/Carousel_MASTER.md)

**Key Features**:
- 93.25% accurate gesture detection
- Multi-tier animation system
- Full accessibility support (WCAG 2.1 AA)
- Monolithic architecture (single-file component)
- Customizable styling and behavior

**Current Version**: v1.0.2 (Monolithic)

**Quick Links**:
- [API Reference](./src/components/carousel/API_Reference.md)
- [Version History](./notes/claude-sessions/Carousel/)

---

## Documentation Structure

```
/
├── notes/
│   └── claude-sessions/
│       ├── Carousel/
│       │   ├── Carousel_MASTER.md          ← Comprehensive overview
│       │   └── [session notes...]
│       └── ThumbReachMapper/
│           ├── Thumbreachmapper_MASTER.md
│           └── [session notes...]
├── src/
│   └── components/
│       ├── carousel/
│       │   ├── AdaptiveCarousel.1.0.2.tsx  ← Current live version
│       │   ├── API_Reference.md            ← API documentation
│       │   └── Archive/
│       │       └── [archived versions...]
│       └── thumbreachmapper/
│           ├── Reachmapper_1.0.2.tsx      ← Current live version
│           └── Archive/
│               └── [archived versions...]
├── Scripts/
│   ├── post_chat.sh                        ← Session integration script
│   └── auto_commit.sh                      ← Auto-commit script
└── PROJECT_NOTES.md                        ← This file
```

---

## Development Guidelines

### Adding New Components

1. Create component directory in `src/components/[componentname]/` (lowercase)
2. Document all versions in `Archive/` subdirectory
3. Create comprehensive documentation:
   - API Reference
   - Usage examples
   - Migration guides
4. Add session notes to `notes/claude-sessions/[ComponentName]/`
5. Update this PROJECT_NOTES.md with links

### Documentation Standards

- Use clear, hierarchical Markdown structure
- Include code examples for all features
- Document breaking changes in version notes
- Provide migration guides between versions
- Include troubleshooting sections

---

## Contributing

This is a personal design system project. For questions or issues, refer to the component-specific documentation or session notes.

---

---

## Project Context for Claude & Cursor

When working with Claude or Cursor, always load these files for context:
- `/notes/claude-sessions/Carousel/Carousel_MASTER.md` - Comprehensive carousel documentation
- `/notes/claude-sessions/ThumbReachMapper/Thumbreachmapper_MASTER.md` - Thumb Reach Mapper documentation
- `/README.md` - Project overview
- `/PROJECT_NOTES.md` - This file (component index and context)

This ensures Claude and Cursor both use the latest master summaries and context when reasoning about components.

---

**Last Updated**: November 2024  
**Project Status**: Active Development