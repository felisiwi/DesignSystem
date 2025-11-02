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
- Modular architecture with reusable hooks
- Customizable styling and behavior

**Current Version**: v1.1.0 (Monolithic)

**Quick Links**:
- [API Reference](./src/Components/Carousel/API_Reference.md)
- [Hooks Documentation](./src/Components/Carousel/Hooks/Hooks_Documentation.md)
- [Utils Documentation](./src/Components/Carousel/Utils/Utils_Documentation.md)
- [Version History](./notes/claude-sessions/Carousel/)

---

## Documentation Structure

```
/
├── notes/
│   └── claude-sessions/
│       └── Carousel/
│           ├── Carousel_MASTER.md          ← Comprehensive overview
│           └── [session notes...]
├── src/
│   └── Components/
│       └── Carousel/
│           ├── API_Reference.md            ← API documentation
│           ├── Hooks/
│           │   └── Hooks_Documentation.md  ← Custom hooks guide
│           ├── Utils/
│           │   └── Utils_Documentation.md  ← Utility functions guide
│           └── Versions/
│               └── [version files...]
└── PROJECT_NOTES.md                        ← This file
```

---

## Development Guidelines

### Adding New Components

1. Create component directory in `src/Components/[ComponentName]/`
2. Document all versions in `Versions/` subdirectory
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

**Last Updated**: November 2024  
**Project Status**: Active Development