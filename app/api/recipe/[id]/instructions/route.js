import React from "react";

const RecipeDetails = ({ analyzedSteps }) => {
  return (
    <div>
      <h2>Instructions</h2>
      <ol>
        {analyzedSteps.map((step, idx) => (
          <li key={idx}>{step.step}</li>
        ))}
      </ol>
    </div>
  );
};

export default RecipeDetails;
