document.addEventListener('DOMContentLoaded', () => {
  const geneSearch = document.getElementById('gene-search');
  const suggestionsDiv = document.getElementById('suggestions');
  const selectedGenesDiv = document.getElementById('selected-genes');
  const ctx = document.getElementById('geneChart').getContext('2d');
  const maxGenes = 5;
  let geneChart;

  let data = {};
  let selectedGenes = [];
  const geneColors = {};
  const colorBlindFriendlyColors = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2'];
  let currentFocus = -1;

  fetch('data.json')
    .then(response => response.json())
    .then(jsonData => {
      data = jsonData;
      console.log('Data fetched successfully:', data); // Debug log
      initializeGeneSearch();
    })
    .catch(error => console.error('Error fetching data:', error)); // Error handling

  function initializeGeneSearch() {
    geneSearch.addEventListener('focus', () => {
      if (selectedGenes.length >= maxGenes) {
        geneSearch.blur();
      } else {
        // Display the top of the list of genes
        suggestionsDiv.innerHTML = '';
        const suggestions = Object.keys(data.genes);
        suggestions.forEach(gene => {
          const div = document.createElement('div');
          div.classList.add('suggestion-item');
          div.textContent = gene;
          div.addEventListener('click', () => {
            selectGene(gene);
          });
          suggestionsDiv.appendChild(div);
        });
      }
    });

    geneSearch.addEventListener('blur', () => {
      // Close the suggestions dropdown
      setTimeout(() => {
        suggestionsDiv.innerHTML = '';
      }, 100); // Delay to allow click event to register
    });

    geneSearch.addEventListener('input', (e) => {
      if (selectedGenes.length >= maxGenes) {
        geneSearch.value = '';
        geneSearch.placeholder = 'Maximum reached';
        e.preventDefault();
        return;
      } else {
        geneSearch.placeholder = 'Enter gene name';
      }

      const query = geneSearch.value.trim().toLowerCase();
      console.log('Search query:', query); // Debug log
      suggestionsDiv.innerHTML = '';
      currentFocus = -1;
      if (query) {
        const suggestions = Object.keys(data.genes).filter(gene => gene.toLowerCase().includes(query));
        console.log('Suggestions:', suggestions); // Debug log
        suggestions.forEach(gene => {
          const div = document.createElement('div');
          div.classList.add('suggestion-item');
          div.textContent = gene;
          div.addEventListener('click', () => {
            selectGene(gene);
          });
          suggestionsDiv.appendChild(div);
        });
      }
    });

    geneSearch.addEventListener('keydown', (e) => {
      const items = suggestionsDiv.getElementsByClassName('suggestion-item');
      if (e.key === 'ArrowDown') {
        currentFocus++;
        addActive(items);
      } else if (e.key === 'ArrowUp') {
        currentFocus--;
        addActive(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentFocus > -1) {
          if (items[currentFocus]) {
            items[currentFocus].click();
          }
        }
      }
    });
  }

  function addActive(items) {
    if (!items) return false;
    removeActive(items);
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;
    items[currentFocus].classList.add('suggestion-active');
  }

  function removeActive(items) {
    for (let i = 0; i < items.length; i++) {
      items[i].classList.remove('suggestion-active');
    }
  }

  function selectGene(gene) {
    if (!selectedGenes.includes(gene)) {
      selectedGenes.push(gene);
      if (!geneColors[gene]) {
        geneColors[gene] = getUnusedColor();
      }
      updateSelectedGenes();
      plotGenes();
    }
    geneSearch.value = '';
    suggestionsDiv.innerHTML = '';
    if (selectedGenes.length >= maxGenes) {
      geneSearch.placeholder = 'Maximum reached';
    } else {
      geneSearch.placeholder = 'Enter gene name';
    }
  }

  function updateSelectedGenes() {
    selectedGenesDiv.innerHTML = '';
    selectedGenes.forEach(gene => {
      const div = document.createElement('div');
      div.classList.add('selected-gene');
      div.innerHTML = `<span class="gene-name">${gene}</span><span class="remove-gene">✖</span>`;
      div.querySelector('.remove-gene').addEventListener('click', () => {
        selectedGenes = selectedGenes.filter(g => g !== gene);
        updateSelectedGenes();
        plotGenes();
        if (selectedGenes.length < maxGenes) {
          geneSearch.placeholder = 'Enter gene name';
        }
      });
      selectedGenesDiv.appendChild(div);
    });
  }

  function plotGenes() {
    const datasets = selectedGenes.map(gene => {
      const geneData = data.genes[gene].map((value, index) => ({ x: Number(data.individuals[index]), y: value }));
      
      // Calculate the third-degree polynomial regression for each gene separately
      const regressionData = data.genes[gene].map((value, index) => [Number(data.individuals[index]), value]);
      const result = regression.polynomial(regressionData, { order: 2 });
      const regressionPoints = result.points.map(point => ({ x: point[0], y: point[1] }));

      return [
        {
          label: `${gene}`,
          data: geneData,
          borderColor: geneColors[gene],
          backgroundColor: geneColors[gene],
          showLine: false, // Disable the line for the points
          fill: false
        },
        {
          label: '', // Hide the regression line from the legend
          data: regressionPoints,
          borderColor: geneColors[gene],
          backgroundColor: geneColors[gene],
          showLine: true, // Enable the line for the regression
          fill: false,
          pointRadius: 1 // Make the regression points smaller
        }
      ];
    }).flat();

    const labels = data.individuals;

    if (geneChart) {
      geneChart.destroy();
    }

    geneChart = new Chart(ctx, {
      type: 'scatter',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: false,
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: {
              display: true,
              text: 'Individual ID'
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Expression Level'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              filter: function(legendItem, data) {
                // Filter out regression datasets
                return legendItem.text !== '';
              }
            }
          },
          annotation: {
            annotations: {
              box1: {
                type: 'box',
                xMin: 0,
                xMax: 10,
                backgroundColor: 'rgba(216, 221, 216, 0.1)',
                label: {
                  display: true,
                  content: 'Childhood',
                  position: 'start',
                  xAdjust: 70,
                  color: 'black',
                  font: {
                    size: 10
                  }
                }
              },
              box2: {
                type: 'box',
                xMin: 10,
                xMax: 20,
                backgroundColor: 'rgba(197, 247, 197, 0.1)',
                label: {
                  display: true,
                  content: 'Adulthood',
                  position: 'start',
                  xAdjust: 70,
                  color: 'black',
                  font: {
                    size: 10
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  function getUnusedColor() {
    const usedColors = Object.values(geneColors);
    for (const color of colorBlindFriendlyColors) {
      if (!usedColors.includes(color)) {
        return color;
      }
    }
    // If all predefined colors are used, generate a random color
    return getRandomColor();
  }

  function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
});