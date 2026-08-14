# scripts/knit-all-files.R
#
# Knits every .Rmd in this project and writes each .html next to its source
# file (same as knitting a single file in RStudio, looped over the site).
#
# Run from RStudio with the .Rproj open, or:
#   Rscript scripts/knit-all-files.R

library(rmarkdown)
library(here)

project_root <- here::here()

rmd_files <- list.files(project_root, pattern = "\\.[Rr]md$",
                        full.names = TRUE, recursive = TRUE)
# skip drafts and archived material
rmd_files <- rmd_files[!grepl("/_drafts/|/_archive/", rmd_files)]

cat(sprintf("Found %d .Rmd file(s) to knit:\n", length(rmd_files)))
cat(paste(" -", rmd_files), sep = "\n"); cat("\n")

for (file in rmd_files) {
  cat(sprintf("Rendering: %s\n", file))
  tryCatch(rmarkdown::render(file, quiet = TRUE),
           error = function(e) message(sprintf("  FAILED: %s\n  %s", file, conditionMessage(e))))
}
cat("\nDone.\n")
