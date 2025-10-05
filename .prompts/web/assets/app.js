// Gitify Prompt Dashboard JavaScript

function initDashboard(prompts) {
  const searchInput = document.getElementById('search');
  const branchFilter = document.getElementById('branchFilter');
  const authorFilter = document.getElementById('authorFilter');
  const promptList = document.getElementById('promptList');

  function filterPrompts() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedBranch = branchFilter.value;
    const selectedAuthor = authorFilter.value;

    const cards = promptList.querySelectorAll('.prompt-card');

    cards.forEach(card => {
      const sha = card.dataset.sha.toLowerCase();
      const branch = card.dataset.branch;
      const author = card.dataset.author;
      const text = card.textContent.toLowerCase();

      const matchesSearch = !searchTerm || text.includes(searchTerm) || sha.includes(searchTerm);
      const matchesBranch = !selectedBranch || branch === selectedBranch;
      const matchesAuthor = !selectedAuthor || author === selectedAuthor;

      if (matchesSearch && matchesBranch && matchesAuthor) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  searchInput.addEventListener('input', filterPrompts);
  branchFilter.addEventListener('change', filterPrompts);
  authorFilter.addEventListener('change', filterPrompts);
}
