1. GitHub 仓库 → Settings → Pages
   - Source 选择 GitHub Actions
2. GitHub 仓库 → Settings → Actions → General
   - 把 Workflow permissions 调成 Read and write permissions （如果你这里是只读，很多 Pages/Deploy 写操作都会被拦）
3. 回到 Actions，把失败的 workflow Re-run 一次（或再 push 一次触发）

如果你是在 Organization 仓库里：还需要确认组织级别没有禁用 Pages（否则无论怎么改工作流都会被策略挡住）。
