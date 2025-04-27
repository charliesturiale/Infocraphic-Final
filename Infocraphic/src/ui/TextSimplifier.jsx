import React, { useState } from 'react';
import { Button } from '@swc-react/button';

const TextSimplifier = ({ sandboxProxy }) => {
    const [inputText, setInputText] = useState('');
    const [infographicData, setInfographicData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const getCanvasDimensions = async () => {
        try {
            // Get dimensions through sandbox proxy
            const dimensions = await sandboxProxy.getCanvasDimensions?.();
            if (dimensions && dimensions.width && dimensions.height) {
                // Calculate scale factor based on the 1080x1920 ratio
                const targetRatio = 1080 / 1920;
                const currentRatio = dimensions.width / dimensions.height;
                
                let scaleFactor;
                if (currentRatio > targetRatio) {
                    // Canvas is wider than target ratio, scale based on height
                    scaleFactor = dimensions.height / 1920;
                } else {
                    // Canvas is taller than target ratio, scale based on width
                    scaleFactor = dimensions.width / 1080;
                }
                
                return {
                    width: dimensions.width,
                    height: dimensions.height,
                    scaleFactor: scaleFactor
                };
            }
            
            // Fallback to default dimensions with 1080x1920 ratio
            return { 
                width: 1080, 
                height: 1920,
                scaleFactor: 1
            };
        } catch (error) {
            console.warn('Could not get canvas dimensions:', error);
            return { 
                width: 1080, 
                height: 1920,
                scaleFactor: 1
            };
        }
    };

    const calculateAdaptiveFontSize = (text, maxWidth, baseFontSize, minFontSize) => {
        // Estimate average character width (this is approximate and may need adjustment)
        const avgCharWidth = baseFontSize * 0.6;
        const textLength = text.length;
        const estimatedWidth = textLength * avgCharWidth;
        
        // If the estimated width is greater than maxWidth, reduce the font size
        if (estimatedWidth > maxWidth) {
            const calculatedSize = Math.floor((maxWidth / textLength) / 0.6);
            return Math.max(calculatedSize, minFontSize); // Ensure font size doesn't go below minimum
        }
        
        return baseFontSize;
    };

    const handleGenerateInfographic = async () => {
        if (!inputText.trim()) return;

        setIsLoading(true);
        setError('');
        setInfographicData(null);
        
        try {
            const apiKey = process.env.DEEPSEEK_API_KEY;
            if (!apiKey) {
                throw new Error('Deepseek API key not found');
            }

            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant that analyzes and simplifies text, and breaks it down into different elements we can incorporate to add to an infographic. With any text entered, pull from it a <6 word title, a 3 sentence overview, a flowchart with EXACTLY 5 nodes (each node having a clear and concise step/concept), and EXACTLY 3 important statistics. The title and overview should always be gathered, but use reasoning depending on the text to determine if a flowchart and statistics are viable visualization mediums. Return ONLY a JSON with objects for the title, overview, and if determined possible, the statistic(s) and the array of nodes for the flowchart. Each flowchart node MUST have a 'title' and 'description' property. The JSON structure should be: { title: string, overview: string, statistics?: string[], flowchart?: [{ title: string, description: string }] }. Return this JSON with NO explanation."
                        },
                        {
                            role: "user",
                            content: inputText
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate infographic data');
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            console.log('Raw API Response:', content);
            
            try {
                let cleanedContent = content.trim();
                cleanedContent = cleanedContent.replace(/```json\n?|\n?```/g, '');
                console.log('Cleaned content:', cleanedContent);
                
                const parsedData = JSON.parse(cleanedContent);
                console.log('Parsed data:', parsedData);
                
                // Add detailed logging for flowchart data
                if (parsedData.flowchart) {
                    console.log('Flowchart data structure:', {
                        isArray: Array.isArray(parsedData.flowchart),
                        length: Array.isArray(parsedData.flowchart) ? parsedData.flowchart.length : 'not an array',
                        firstNode: parsedData.flowchart[0],
                        allNodes: parsedData.flowchart
                    });
                }
                
                if (!parsedData.title || !parsedData.overview) {
                    throw new Error('Missing required fields in response');
                }
                
                setInfographicData(parsedData);
            } catch (parseError) {
                console.error('Error parsing infographic data:', parseError);
                console.error('Failed content:', content);
                throw new Error(`Failed to parse infographic data: ${parseError.message}`);
            }
        } catch (error) {
            console.error('Error:', error);
            setError(error.message || 'Error occurred while generating infographic data.');
        } finally {
            setIsLoading(false);
        }
    };

    const addElementToCanvas = async (type, content) => {
        if (!sandboxProxy) {
            setError('Canvas not available');
            return;
        }

        try {
            // Get canvas dimensions and scale factor
            const { width: canvasWidth, height: canvasHeight, scaleFactor } = await getCanvasDimensions();

            // Define layout areas based on canvas dimensions and scale factor
            const margin = Math.min(canvasWidth, canvasHeight) * 0.05 * scaleFactor; // 5% margin
            const halfWidth = canvasWidth / 2;
            const halfHeight = canvasHeight / 2;

            // Define section dimensions with scaling
            const titleArea = {
                x: margin,
                y: margin,
                width: canvasWidth - (margin * 2),
                height: canvasHeight * 0.1
            };

            const overviewArea = {
                x: margin,
                y: titleArea.y + titleArea.height + margin,
                width: halfWidth - (margin * 2),
                height: halfHeight - (margin * 2)
            };

            const statsArea = {
                x: margin,
                y: overviewArea.y + overviewArea.height + margin,
                width: halfWidth - (margin * 2),
                height: canvasHeight - (overviewArea.y + overviewArea.height + margin * 2)
            };

            const flowchartArea = {
                x: halfWidth + margin,
                y: titleArea.y + titleArea.height + margin,
                width: halfWidth - (margin * 2),
                height: canvasHeight - (titleArea.height + margin * 3)
            };

            // Define fixed node areas for 5 nodes
            const nodeCount = 5;
            const nodeHeight = (flowchartArea.height - margin * 6) / nodeCount; // Increased bottom margin
            const nodeSpacing = nodeHeight * 0.1;
            const nodeAreas = Array.from({ length: nodeCount }, (_, i) => ({
                x: flowchartArea.x + margin,
                y: flowchartArea.y + margin * 2 + (i * (nodeHeight + nodeSpacing)),
                width: flowchartArea.width - (margin * 2),
                height: nodeHeight
            }));

            // Calculate font sizes based on canvas dimensions and scale factor
            const baseFontSize = Math.min(canvasWidth, canvasHeight) * 0.02 * scaleFactor; // 2% of smaller dimension
            const titleFontSize = baseFontSize * 2.1;
            const overviewFontSize = baseFontSize * 1.1;
            const statsFontSize = baseFontSize * 1.4;
            const nodeTitleFontSize = baseFontSize * 0.9;
            const nodeDescFontSize = baseFontSize * 0.74;

            switch (type) {
                case 'title':
                    // Calculate adaptive font size for title with minimum size constraint
                    const sectionHeaderFontSize = baseFontSize * 2.0;
                    const adaptiveTitleFontSize = calculateAdaptiveFontSize(
                        content,
                        titleArea.width - (margin * 4),
                        titleFontSize,
                        sectionHeaderFontSize
                    );

                    // Create title background
                    await sandboxProxy.createRectangleWithProps({
                        width: titleArea.width,
                        height: titleArea.height,
                        x: titleArea.x,
                        y: titleArea.y,
                        colorHex: '#E3F2FD'
                    });
                    await sandboxProxy.createTextWithProps({
                        text: content,
                        x: titleArea.x + titleArea.width / 2,
                        y: titleArea.y + titleArea.height / 1.6,
                        fontSize: adaptiveTitleFontSize,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        colorHex: '#000000',
                        width: titleArea.width - (margin * 4),
                        textDecoration: 'underline',
                        fontFamily: 'Montserrat'
                    });
                    break;

                case 'overview':
                    // Convert overview to a readable string format
                    let overviewText;
                    if (Array.isArray(content)) {
                        overviewText = content.join('\n\n');
                    } else if (typeof content === 'object') {
                        overviewText = Object.values(content).join('\n\n');
                    } else {
                        overviewText = content.toString();
                    }

                    // Create overview background
                    await sandboxProxy.createRectangleWithProps({
                        width: overviewArea.width,
                        height: overviewArea.height,
                        x: overviewArea.x,
                        y: overviewArea.y,
                        colorHex: '#F1F8E9'
                    });

                    // Add "Overview" header
                    await sandboxProxy.createTextWithProps({
                        text: "Overview",
                        x: overviewArea.x + overviewArea.width / 2,
                        y: overviewArea.y + margin*1.4,
                        fontSize: baseFontSize * 2.0,
                        fontWeight: 'bold',
                        textDecoration: 'underline',
                        colorHex: '#000000',
                        width: overviewArea.width,
                        textAlign: 'center',
                        fontFamily: 'Montserrat'
                    });

                    // Add underline for Overview header
                    await sandboxProxy.createRectangleWithProps({
                        width: overviewArea.width - (margin * 2),
                        height: 2,
                        x: overviewArea.x + margin,
                        y: overviewArea.y + margin + baseFontSize * 2.0 + 5,
                        colorHex: '#000000'
                    });

                    // Calculate maximum characters per line based on container width and font size
                    const maxCharsPerLine = Math.floor( (0.8 * overviewArea.width) / (overviewFontSize * 0.6));
                    
                    // Split text into words and create lines
                    const words = overviewText.split(/\s+/);
                    let currentLine = '';
                    let lines = [];
                    
                    for (const word of words) {
                        if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
                            currentLine = currentLine ? currentLine + ' ' + word : word;
                        } else {
                            if (currentLine) lines.push(currentLine);
                            currentLine = word;
                        }
                    }
                    if (currentLine) lines.push(currentLine);
                    
                    // Join lines with newlines
                    const wrappedOverviewText = lines.join('\n');

                    await sandboxProxy.createTextWithProps({
                        text: wrappedOverviewText,
                        x: overviewArea.x + overviewArea.width / 2,
                        y: overviewArea.y + overviewArea.height * 0.22,
                        fontSize: overviewFontSize,
                        colorHex: '#000000',
                        width: overviewArea.width,
                        lineHeight: overviewFontSize * 2.8,
                        textAlign: 'center',
                        fontFamily: 'Open Sans'
                    });
                    break;

                case 'statistic':
                    // Convert statistics to a readable string format with bullet points
                    let statsText = '';
                    if (Array.isArray(content)) {
                        statsText = content.map(stat => `• ${stat}`).join('\n\n\n');
                    } else if (typeof content === 'object') {
                        statsText = Object.values(content).map(stat => `• ${stat}`).join('\n\n\n');
                    } else if (content) {
                        statsText = `• ${content.toString()}`;
                    }

                    if (!statsText.trim()) {
                        console.warn('No statistics content to display');
                        return;
                    }

                    // Create statistics background
                    await sandboxProxy.createRectangleWithProps({
                        width: statsArea.width,
                        height: statsArea.height,
                        x: statsArea.x,
                        y: statsArea.y,
                        colorHex: '#FFF3E0'
                    });

                    // Add "Statistics" header
                    await sandboxProxy.createTextWithProps({
                        text: "Statistics",
                        x: statsArea.x + statsArea.width / 2,
                        y: statsArea.y + margin * 1.4,
                        fontSize: baseFontSize * 2.0,
                        fontWeight: 'bold',
                        textDecoration: 'underline',
                        colorHex: '#000000',
                        width: statsArea.width,
                        textAlign: 'center',
                        fontFamily: 'Montserrat'
                    });

                    // Add underline for Statistics header
                    await sandboxProxy.createRectangleWithProps({
                        width: statsArea.width - (margin * 2),
                        height: 2,
                        x: statsArea.x + margin,
                        y: statsArea.y + margin * 1.2 + baseFontSize * 2.0 + 5,
                        colorHex: '#000000'
                    });

                    // Calculate maximum characters per line based on container width and font size
                    const maxStatsCharsPerLine = Math.floor((0.92* statsArea.width) / (statsFontSize * 0.6));
                    
                    // Split text into words and create lines for each statistic
                    const statsLines = [];
                    const statsArray = statsText.split('\n\n\n');
                    
                    for (const stat of statsArray) {
                        const words = stat.split(/\s+/);
                        let currentLine = '';
                        let statLines = [];
                        
                        for (const word of words) {
                            if ((currentLine + ' ' + word).length <= maxStatsCharsPerLine) {
                                currentLine = currentLine ? currentLine + ' ' + word : word;
                            } else {
                                if (currentLine) statLines.push(currentLine);
                                currentLine = word;
                            }
                        }
                        if (currentLine) statLines.push(currentLine);
                        
                        statsLines.push(statLines.join('\n'));
                    }
                    
                    // Join statistics with extra spacing
                    const wrappedStatsText = statsLines.join('\n\n');

                    // Adjust font size and vertical position based on number of statistics
                    const statsCount = statsArray.length;
                    const adjustedStatsFontSize = statsCount === 3 ? statsFontSize * 0.9 : statsFontSize;
                    const verticalOffset = statsCount === 3 ? 0.3 : 0.4;

                    await sandboxProxy.createTextWithProps({
                        text: wrappedStatsText,
                        x: statsArea.x + statsArea.width / 2,
                        y: statsArea.y + (statsArea.height * verticalOffset) * 0.91,
                        fontSize: adjustedStatsFontSize,
                        colorHex: '#000000',
                        width: statsArea.width,
                        lineHeight: adjustedStatsFontSize * 3.0,
                        textAlign: 'left',
                        fontFamily: 'Open Sans'
                    });
                    break;

                case 'flowchart':
                    console.log('Processing flowchart with content:', content);
                    console.log('Content type:', typeof content);
                    console.log('Is array:', Array.isArray(content));
                    if (Array.isArray(content)) {
                        console.log('Array length:', content.length);
                        console.log('First node:', content[0]);
                    }
                    
                    // Create flowchart background
                    await sandboxProxy.createRectangleWithProps({
                        width: flowchartArea.width,
                        height: flowchartArea.height,
                        x: flowchartArea.x,
                        y: flowchartArea.y,
                        colorHex: '#F3E5F5'
                    });

                    // Add "Flowchart" header
                    await sandboxProxy.createTextWithProps({
                        text: "Flowchart",
                        x: flowchartArea.x + flowchartArea.width / 2,
                        y: flowchartArea.y + margin * 1.4,
                        fontSize: baseFontSize * 2.0,
                        fontWeight: 'bold',
                        textDecoration: 'underline',
                        colorHex: '#000000',
                        width: flowchartArea.width,
                        textAlign: 'center',
                        fontFamily: 'Montserrat'
                    });

                    // Add underline for Flowchart header
                    await sandboxProxy.createRectangleWithProps({
                        width: flowchartArea.width - (margin * 2),
                        height: 2,
                        x: flowchartArea.x + margin,
                        y: flowchartArea.y + margin * 1.2 + baseFontSize * 2.0 + 5,
                        colorHex: '#000000'
                    });
                    
                    // Calculate node dimensions
                    const nodeCount = 5; // Fixed 5 nodes
                    const nodeHeight = (flowchartArea.height - margin * 6) / nodeCount; // Increased bottom margin
                    const nodeSpacing = nodeHeight * 0.1;
                    
                    // Create boxes and text for each node
                    for (let i = 0; i < nodeCount; i++) {
                        const node = content[i];
                        if (!node || !node.title) {
                            console.warn(`Skipping node ${i} - missing required properties`);
                            continue;
                        }
                        
                        const nodeX = flowchartArea.x + margin;
                        const nodeY = flowchartArea.y + margin * 3 + (i * (nodeHeight + nodeSpacing)); // Increased initial y-offset
                        
                        // Node box
                        await sandboxProxy.createRectangleWithProps({
                            width: flowchartArea.width - (margin * 2),
                            height: nodeHeight,
                            x: nodeX,
                            y: nodeY,
                            colorHex: '#FFFFFF'
                        });
                        
                        // Node title
                        await sandboxProxy.createTextWithProps({
                            text: node.title,
                            x: nodeX + (flowchartArea.width - (margin * 2)) / 2,
                            y: nodeY + nodeHeight * 0.2,
                            fontSize: nodeTitleFontSize,
                            fontWeight: 'bold',
                            colorHex: '#000000',
                            width: flowchartArea.width - (margin * 4),
                            lineHeight: nodeTitleFontSize * 1.2,
                            textAlign: 'center',
                            fontFamily: 'Montserrat'
                        });
                        
                        // Node description if it exists
                        if (node.description) {
                            // Calculate maximum characters per line based on container width and font size
                            // Reduced margin for description text
                            const maxCharsPerLine = Math.floor((flowchartArea.width - (margin * 3)) / (nodeDescFontSize * 0.6));
                            
                            // Split text into words and create lines
                            const words = node.description.split(/\s+/);
                            let currentLine = '';
                            let lines = [];
                            
                            for (const word of words) {
                                if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
                                    currentLine = currentLine ? currentLine + ' ' + word : word;
                                } else {
                                    if (currentLine) lines.push(currentLine);
                                    currentLine = word;
                                }
                            }
                            if (currentLine) lines.push(currentLine);
                            
                            // Join lines with newlines
                            const wrappedDescription = lines.join('\n');

                            await sandboxProxy.createTextWithProps({
                                text: wrappedDescription,
                                x: nodeX + (flowchartArea.width - (margin * 2)) / 2,
                                y: nodeY + nodeHeight * 0.5,
                                fontSize: nodeDescFontSize,
                                colorHex: '#000000',
                                width: flowchartArea.width - (margin * 3), // Reduced margin for description
                                lineHeight: nodeDescFontSize * 1.5,
                                textAlign: 'center',
                                fontFamily: 'Open Sans'
                            });
                        }
                    }
                    break;
            }    
        } catch (error) {
            console.error('Error adding element to canvas:', error);
            setError('Error adding element to canvas: ' + error.message);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #FF7F50 0%, #9370DB 100%)',
            padding: '20px',
            fontFamily: 'Montserrat, sans-serif',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Pattern overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0px, rgba(255, 255, 255, 0.1) 2px, transparent 2px, transparent 4px)',
                opacity: 0.5,
                pointerEvents: 'none'
            }} />

            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                position: 'relative',
                zIndex: 1
            }}>
                <h1 style={{
                    textAlign: 'center',
                    color: '#fff',
                    fontSize: '2em',
                    marginBottom: '20px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
                    paddingTop: '20px',
                    marginLeft: '-5px'
                }}>
                    Infocraftic
                </h1>

                <p style={{
                    textAlign: 'center',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.8em',
                    fontStyle: 'italic',
                    marginBottom: '20px'
                }}>
                    Note: Currently optimized for canvases with a 1080x1920 aspect ratio
                </p>

                <div style={{
                    marginBottom: '30px',
                    display: 'flex',
                    justifyContent: 'center'
                }}>
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Enter large body of text (essay, research paper, article, etc.)..."
                        style={{
                            width: 'calc(100% - 10px)', // Adjusted to match button width
                            minHeight: '150px',
                            padding: '15px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '16px',
                            fontFamily: 'Open Sans, sans-serif',
                            resize: 'vertical',
                            transition: 'all 0.3s ease',
                            outline: 'none',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                    />
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '30px'
                }}>
                    <button
                        onClick={handleGenerateInfographic}
                        disabled={isLoading || !inputText.trim()}
                        style={{
                            padding: '15px 30px',
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#fff',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            border: '2px solid rgba(255, 255, 255, 0.4)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            backdropFilter: 'blur(7px)',
                            ':hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                            }
                        }}
                    >
                        {isLoading ? 'Generating...' : 'Generate Elements!'}
                    </button>
                </div>

                {error && (
                    <div style={{
                        padding: '15px',
                        backgroundColor: 'rgba(255, 235, 238, 0.9)',
                        color: '#c62828',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 154, 154, 0.5)',
                        marginBottom: '20px',
                        textAlign: 'center',
                        backdropFilter: 'blur(5px)'
                    }}>
                        {error}
                    </div>
                )}

                {infographicData && (
                    <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '20px',
                        backdropFilter: 'blur(5px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        <h3 style={{
                            color: '#fff',
                            marginBottom: '20px',
                            textAlign: 'center',
                            fontSize: '1.5em',
                            textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
                        }}>
                            Click an element to add it to your infographic
                        </h3>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px'
                        }}>
                            <button
                                onClick={() => addElementToCanvas('title', infographicData.title)}
                                style={{
                                    padding: '12px 20px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: '#fff',
                                    backgroundColor: 'rgba(46, 204, 113, 0.8)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    backdropFilter: 'blur(7px)',
                                    ':hover': {
                                        backgroundColor: 'rgba(46, 204, 113, 0.95)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                                    }
                                }}
                            >
                                Add Title
                            </button>
                            <button
                                onClick={() => addElementToCanvas('overview', infographicData.overview)}
                                style={{
                                    padding: '12px 20px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: '#fff',
                                    backgroundColor: 'rgba(231, 76, 60, 0.8)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    backdropFilter: 'blur(7px)',
                                    ':hover': {
                                        backgroundColor: 'rgba(231, 76, 60, 0.95)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                                    }
                                }}
                            >
                                Add Overview
                            </button>
                            {infographicData.statistics && (
                                <button
                                    onClick={() => addElementToCanvas('statistic', infographicData.statistics)}
                                    style={{
                                        padding: '12px 20px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: '#fff',
                                        backgroundColor: 'rgba(155, 89, 182, 0.8)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        backdropFilter: 'blur(7px)',
                                        ':hover': {
                                            backgroundColor: 'rgba(155, 89, 182, 0.95)',
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                                        }
                                    }}
                                >
                                    Add Statistics
                                </button>
                            )}
                            {infographicData.flowchart && (
                                <button
                                    onClick={() => addElementToCanvas('flowchart', infographicData.flowchart)}
                                    style={{
                                        padding: '12px 20px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: '#fff',
                                        backgroundColor: 'rgba(243, 156, 18, 0.8)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        backdropFilter: 'blur(7px)',
                                        ':hover': {
                                            backgroundColor: 'rgba(243, 156, 18, 0.95)',
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                                        }
                                    }}
                                >
                                    Add Flowchart
                                </button>
                            )}
                        </div>
                        <p style={{
                            textAlign: 'center',
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontSize: '0.8em',
                            fontStyle: 'italic',
                            marginTop: '20px',
                            marginBottom: '0'
                        }}>
                            Click on elements to edit colors, fonts, sizing, etc.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TextSimplifier; 