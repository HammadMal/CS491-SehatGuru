"""
Generate a comprehensive chart showing accuracy and average confidence for all dishes
"""
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import os

# Get the directory where the script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# Read the statistics CSV
df = pd.read_csv(os.path.join(script_dir, 'confidence_test_statistics.csv'))

# Sort by confidence descending
df = df.sort_values('Avg Confidence (%)', ascending=False)

# Create figure with larger size
fig, ax = plt.subplots(figsize=(14, 10))

# Set position for bars
x = np.arange(len(df))
width = 0.6

# Create bars
bars = ax.bar(x, df['Avg Confidence (%)'], width, label='Avg Confidence (%)', 
              color='#3498db', alpha=0.8, edgecolor='black', linewidth=0.5)

# Customize the plot
ax.set_xlabel('Dish Name', fontsize=12, fontweight='bold')
ax.set_ylabel('Average Confidence (%)', fontsize=12, fontweight='bold')
ax.set_title('Model Confidence Scores per Dish\nTop 20 Pakistani Dishes', 
             fontsize=14, fontweight='bold', pad=20)
ax.set_xticks(x)
ax.set_xticklabels(df['Dish Name'], rotation=45, ha='right', fontsize=9)
ax.grid(axis='y', alpha=0.3, linestyle='--')
ax.set_ylim(0, 85)

# Add value labels on bars
for bar in bars:
    height = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2., height,
            f'{height:.1f}',
            ha='center', va='bottom', fontsize=8)

# Add overall statistics as text box
overall_conf = df['Avg Confidence (%)'].mean()
textstr = f'Overall Average\nConfidence: {overall_conf:.2f}%'
props = dict(boxstyle='round', facecolor='wheat', alpha=0.5)
ax.text(0.98, 0.02, textstr, transform=ax.transAxes, fontsize=10,
        verticalalignment='bottom', horizontalalignment='right', bbox=props)

# Adjust layout to prevent label cutoff
plt.tight_layout()

# Save the figure
output_path = os.path.join(script_dir, 'confidence_accuracy_chart.png')
plt.savefig(output_path, dpi=300, bbox_inches='tight')
print(f"✅ Chart saved as '{output_path}'")

# Show the plot
plt.show()
