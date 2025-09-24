# Infocraftic - AI-Powered Infographic Generator

**A sophisticated Adobe Express Add-on that leverages AI to automatically transform text content into structured, visually appealing infographic elements.**

## 🎯 Project Overview

Infocraftic is a React-based Adobe Express Add-on that uses artificial intelligence to analyze text input and generate professional infographic components. The application integrates with the DeepSeek API to intelligently extract key information and present it in visually structured formats optimized for Adobe Express canvases.

### Key Features

- **AI-Powered Content Analysis**: Automatically extracts titles, overviews, statistics, and process flows from any text
- **Intelligent Layout System**: Dynamically positions elements based on canvas dimensions with responsive scaling
- **Professional Design Templates**: Pre-configured color schemes and typography optimized for infographics
- **Interactive Element Placement**: Click-to-add functionality for seamless integration with Adobe Express workflow
- **Adaptive Text Wrapping**: Smart text formatting that adjusts to container constraints

## 🚀 Technical Implementation

### Architecture
- **Frontend**: React with functional components and hooks for state management
- **Adobe Integration**: Document Sandbox Runtime for secure canvas manipulation
- **AI Integration**: DeepSeek API for natural language processing and content extraction
- **Build System**: Webpack with Babel transpilation for modern JavaScript features

### Core Components
- **TextSimplifier**: Main component handling AI processing and UI interactions
- **Canvas Manager**: Intelligent positioning system with responsive scaling algorithms
- **API Service**: Secure integration with DeepSeek for content analysis

### Smart Features
- **Dynamic Font Sizing**: Automatically adjusts text size based on content length and container width
- **Multi-format Output**: Generates titles, overviews, statistics, and flowcharts based on content analysis
- **Canvas Optimization**: Designed for 1080x1920 aspect ratio with flexible scaling support
- **Error Handling**: Comprehensive error management with user-friendly feedback

## 🛠️ Technology Stack

- **React 18.2.0** - Modern functional components with hooks
- **Adobe Add-on SDK** - Document Sandbox Runtime integration
- **DeepSeek AI API** - Advanced natural language processing
- **Webpack 5** - Module bundling and optimization
- **Babel** - JavaScript transpilation for cross-browser compatibility
- **Adobe Spectrum Web Components** - UI component library

## 📋 Setup & Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   - Create a `.env` file with your DeepSeek API key:
   ```
   DEEPSEEK_API_KEY=your_api_key_here
   ```

3. **Development Build**
   ```bash
   npm run build
   ```

4. **Start Development Server**
   ```bash
   npm run start
   ```

5. **Package for Distribution**
   ```bash
   npm run package
   ```

## 💼 Professional Application

This project demonstrates several key software engineering competencies:

- **API Integration**: Secure external service integration with error handling
- **UI/UX Design**: Intuitive interface design with responsive layouts
- **Algorithm Development**: Complex positioning and scaling calculations
- **Modern JavaScript**: ES6+ features, async/await, and functional programming
- **Adobe Ecosystem**: Professional integration with Adobe Creative Cloud platform
- **Performance Optimization**: Efficient rendering and resource management

## 🎨 Usage Workflow

1. **Input**: Paste any text content (articles, research papers, essays)
2. **Processing**: AI analyzes content and extracts key components
3. **Generation**: Creates structured infographic elements (title, overview, statistics, flowchart)
4. **Integration**: One-click addition to Adobe Express canvas with professional formatting
