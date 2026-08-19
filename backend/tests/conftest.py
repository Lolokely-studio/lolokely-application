import os
import sys

# Rend `import db` possible depuis tests/ sans installer le backend en paquet.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
