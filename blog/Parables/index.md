---
title: "Project 0: Introduction"
date: 2020-05-01T11:02:05+06:00
lastmod: 2020-09-15T10:42:26+06:00
weight: 1
draft: false
# search related keywords
keywords: [""]
---

### Background

{{% notice note %}}

We will complete six projects during the semester that each take about four days of class.  On average, a student will spend 2 hours outside of class per hour in class to complete the assigned readings, submit any Canvas items, and complete the project (for a total of 8 hours per project). The instruction for each project will be structured into sections as written on this page. 

This first Background section provides context for the project. Make sure you read the background carefully to see the big picture needs and purpose of the project.
{{% /notice %}}


Python and VS Code are tools commonly used in the field of data science. During our first two days of class we will get VS Code prepped for data science programming. Completing Project 0 will set you pu for success the rest of the semester.

### Data

{{% notice note %}}
Every data science project should start with data, and our class projects are no different. Each project will have __'Download'__ and __'Information'__ links like the ones below.
{{% /notice %}}

__Download:__ [mpg data](https://github.com/byuidatascience/data4python4ds/raw/master/data-raw/mpg/mpg.csv)   
__Information:__ [Data description](https://github.com/byuidatascience/data4python4ds/blob/master/data.md#fuel-economy-data-from-1999-to-2008-for-38-popular-models-of-cars)

### Readings

{{% notice note %}}
The Readings section will contain links to reading assignments that are required for each project, as well as optional references. Remember that you are reading this material to build skills. Take the time to comprehend the readings and the skills contained within.  

We recommend reading through the assigned material once for a general understanding before the first day of each project.  You will reread and reference the material multiple times as you complete the project.

{{% /notice %}}


The readings listed below are required for the first two days of class.

- [Python for Data Science (P4DS): Introduction](https://byuidatascience.github.io/python4ds/introduction.html)
- [P4DS: Data Visualization Section 3.1 & 3.2 Only](https://byuidatascience.github.io/python4ds/data-visualisation.html)

<!------------------- 

- [Saving Altair charts](../../course-materials/altair/)
- [Markdown for DS](../../course-materials/markdown/)

-------------------->



#### Optional References

- [VS Code user interface](https://code.visualstudio.com/docs/getstarted/userinterface) 
- [Reading Technical Documentation](https://byui-cse.github.io/cse450-course/course/reading-technical-documentation.html)

### Questions and Tasks:

{{% notice note %}}
This section lists the questions and tasks that need to be completed for the project. Your work on the project must be compiled into a rport and submitted in Canvas by the weekend following the last day of material for the project.  
{{% /notice %}}

1. __Finish the readings and be prepared with any questions to get your environment working smoothly (class for on-campus and Slack for online)__
2. __In VS Code, write a python script to create the example Altair chart from section 3.2.2 of the textbook (part of the assigned readings). Note that you have to type chart to see the Altair chart after you create it.__
3. __Your final report should also include the markdown table created from the following (assuming you have `mpg` from question 2).__

  ```python
  print(mpg
    .head(5)
    .filter(["manufacturer", "model","year", "hwy"])
    .to_markdown(index=False))
  ```

### Deliverables:

{{% notice note %}}
Deliverables are “the quantifiable goods or services that must be provided upon the completion of a project”. In this class the deliverable for each project is a HTML report created using Quarto. This final section will be the same for each project. 
{{% /notice %}}

_Use this [template](https://byuistats.github.io/DS250-Course/template/ds250_project_template_clean.qmd) to submit your Client Report. The template has three sections (for additional details please see the [instructional template](https://byuistats.github.io/DS250-Course/template/ds250_project_template.qmd)):_

1. _A short summary that highlights key that describes the results describing insights from  metrics  of the project and the tools you used (Think “elevator pitch”)._
2. _Answers to the questions from the "Questions and Tasks" section above. Each answer should include a written description of your results, code snippets, charts, and tables._

<!-- 
{{% notice note %}}
  This is a simple note.
{{% /notice %}}

{{% notice tip %}}
  This is a simple tip.
{{% /notice %}}

{{% notice info %}}
  This is a simple info.
{{% /notice %}} -->