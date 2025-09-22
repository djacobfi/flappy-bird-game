#!/usr/bin/env python3
import re

def remove_console_statements(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Remove console.log statements (but keep console.error for critical errors)
    content = re.sub(r'^\s*console\.log\([^)]*\);\s*$', '', content, flags=re.MULTILINE)
    content = re.sub(r'^\s*console\.warn\([^)]*\);\s*$', '', content, flags=re.MULTILINE)
    
    # Remove console.log from any line (including inline)
    content = re.sub(r'console\.log\([^)]*\);\s*', '', content)
    content = re.sub(r'console\.warn\([^)]*\);\s*', '', content)
    
    # Remove console.log from .catch() blocks
    content = re.sub(r'\.catch\([^)]*console\.log\([^)]*\)[^)]*\)', '.catch(e => {})', content)
    
    # Clean up empty lines
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    with open(file_path, 'w') as f:
        f.write(content)

# Process both files
remove_console_statements('flappy-bird.js')
remove_console_statements('leaderboard.js')
print("Console statements removed successfully!")
