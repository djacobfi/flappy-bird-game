#!/usr/bin/env python3
import re

def clean_console_statements(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Remove console.log statements but keep console.error
    lines = content.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # Skip lines that contain console.log or console.warn
        if 'console.log(' in line or 'console.warn(' in line:
            # If it's a standalone console statement, skip the line
            if line.strip().startswith('console.log(') or line.strip().startswith('console.warn('):
                continue
            # If it's inline, remove just the console part
            line = re.sub(r'console\.log\([^)]*\);\s*', '', line)
            line = re.sub(r'console\.warn\([^)]*\);\s*', '', line)
            # Clean up empty lines
            if line.strip():
                cleaned_lines.append(line)
        else:
            cleaned_lines.append(line)
    
    with open(file_path, 'w') as f:
        f.write('\n'.join(cleaned_lines))

# Process both files
clean_console_statements('flappy-bird.js')
clean_console_statements('leaderboard.js')
print("Console statements cleaned successfully!")
