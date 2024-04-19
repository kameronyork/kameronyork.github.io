library(tidyverse)
library(rmarkdown)
library(purrr)

# Set the working directory to the parent directory of "parables"
setwd("C:/Users/theka/Desktop/Projects/Website_project/kameronyork.com")

# List all .rmd files in the parables folder
rmd_files <- list.files("parables", pattern = "\\.rmd$", full.names = TRUE)

# Loop through each .rmd file and knit it
for (file in rmd_files) {
  rmarkdown::render(file)
}


