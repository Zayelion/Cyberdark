# Cyberdark Combo Analysis System

## Concept

## Installation

1. Install [NodeJS](https://nodejs.org/en/)
2. From command line in the installation folder run `npm i` to install the dependencies.

## Usage
From command line 
```
Usage: node ./analyze [options]

Options:
  -d, --deck <char>     file name of deck to analyze
  -t, --tries <number>  number of times to test
  -s, --go-second       optionally go second
  -h, --help            display help for command
```

It should print out something similar to the following.
```
Cyberdark End Dragon 65.97%
Any Fusion Monster 89.26%
```

### Example
```
node ./analyze -d "C:\ygo\games\ProjectIgnis\deck\Cyberdark Legacy.ydk" -t 200000  
```