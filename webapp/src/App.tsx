import { useState, useEffect } from 'react';
import './App.css';
import { ForceGraph } from './components/ForceGraph';
import { VennDiagram } from './components/VennDiagram';
import { MatrixHeatmap } from './components/MatrixHeatmap';
import { fetchAllData, type AppData } from './shell/api';
import { buildShowOverlapGraph } from './core/graph';
import type { Graph, GraphNode } from './core/types';

type ViewMode = 'all' | 'graph' | 'venn' | 'matrix';

function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchAllData();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const graph: Graph | null = data
    ? buildShowOverlapGraph(data.shows, data.writers, data.links)
    : null;

  if (loading) {
    return (
      <div className="app loading">
        <h1>TV Writer Overlap Explorer</h1>
        <p>Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app error">
        <h1>TV Writer Overlap Explorer</h1>
        <p className="error-message">Error: {error}</p>
        <p>
          Make sure the API server is running:{' '}
          <code>cd scraper && python3 api.py</code>
        </p>
      </div>
    );
  }

  if (!data || !graph) {
    return (
      <div className="app">
        <h1>TV Writer Overlap Explorer</h1>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>TV Writer Overlap Explorer</h1>
        <p className="subtitle">
          Discover connections between TV shows through their writers.
          {data.shows.length} shows, {data.writers.length} writers loaded.
        </p>

        <nav className="view-tabs">
          <button
            className={viewMode === 'all' ? 'active' : ''}
            onClick={() => setViewMode('all')}
          >
            All Drafts
          </button>
          <button
            className={viewMode === 'graph' ? 'active' : ''}
            onClick={() => setViewMode('graph')}
          >
            Force Graph
          </button>
          <button
            className={viewMode === 'venn' ? 'active' : ''}
            onClick={() => setViewMode('venn')}
          >
            Venn Diagram
          </button>
          <button
            className={viewMode === 'matrix' ? 'active' : ''}
            onClick={() => setViewMode('matrix')}
          >
            Matrix Heatmap
          </button>
        </nav>
      </header>

      <main>
        {(viewMode === 'all' || viewMode === 'graph') && (
          <section className="visualization">
            <ForceGraph
              graph={graph}
              width={viewMode === 'all' ? 700 : 900}
              height={viewMode === 'all' ? 500 : 700}
              onNodeClick={setSelectedNode}
            />
            {selectedNode && (
              <div className="node-info">
                <strong>Selected:</strong> {selectedNode.label} (
                {selectedNode.type})
              </div>
            )}
          </section>
        )}

        {(viewMode === 'all' || viewMode === 'venn') && (
          <section className="visualization">
            <VennDiagram
              shows={data.shows}
              writers={data.writers}
              links={data.links}
            />
          </section>
        )}

        {(viewMode === 'all' || viewMode === 'matrix') && (
          <section className="visualization">
            <MatrixHeatmap
              shows={data.shows}
              writers={data.writers}
              links={data.links}
            />
          </section>
        )}
      </main>

      <footer>
        <p>
          Data scraped from IMDB. See how writers connect your favorite shows!
        </p>
      </footer>
    </div>
  );
}

export default App;
