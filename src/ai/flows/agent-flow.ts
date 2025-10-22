'use server';
/**
 * @fileOverview The main AI agent flow for controlling the application via voice or text commands.
 *
 * This file defines the core logic for the LawnRoute AI agent. It uses Genkit tools
 * to interact with the application's features, such as adding or selecting customers.
 *
 * - agentFlow - The main flow that processes user commands.
 * - AgentFlowInput - The input type for the agent flow.
 * - AgentFlowOutput - The return type for the agent flow, indicating the action taken.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Customer, Route } from '@/lib/types';

//
// Tool for adding a new customer
//
const AddCustomerToolInputSchema = z.object({
  name: z.string().describe('The full name of the customer.'),
  address: z.string().describe('The full address of the customer.'),
  serviceRequested: z
    .string()
    .describe('The service the customer has requested.'),
  notes: z.string().optional().describe('Any additional notes for the customer.'),
});
type AddCustomerToolInput = z.infer<typeof AddCustomerToolInputSchema>;

const addCustomerTool = ai.defineTool(
  {
    name: 'addCustomer',
    description: 'Use when the user wants to add a new customer to the system.',
    inputSchema: AddCustomerToolInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    // In a real application, this would interact with a database.
    // For now, we simulate success. The client will handle the state update.
    console.log('Tool: Adding customer', input);
    return { success: true };
  }
);

//
// Tool for selecting a customer
//
const SelectCustomerToolInputSchema = z.object({
  customerId: z.string().describe("The ID of the customer to select, like 'C001'."),
  customerName: z.string().describe('The name of the customer to select.'),
});
type SelectCustomerToolInput = z.infer<typeof SelectCustomerToolInputSchema>;

const selectCustomerTool = ai.defineTool(
  {
    name: 'selectCustomer',
    description: 'Use when the user wants to view the details of a specific customer.',
    inputSchema: SelectCustomerToolInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    // This tool helps identify which user wants to see.
    // The client will use the output to show the details.
    console.log('Tool: Selecting customer', input);
    return { success: true };
  }
);

//
// Tool for optimizing a route
//
const RouteCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
});
const GetOptimizedRouteToolInputSchema = z.object({
  customers: z.array(RouteCustomerSchema).describe('The list of customers for whom to generate the route.')
});
type GetOptimizedRouteToolInput = z.infer<typeof GetOptimizedRouteToolInputSchema>;

const RouteStopSchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  address: z.string(),
});
const RouteSchema = z.object({
  stops: z.array(RouteStopSchema).describe('The ordered list of stops in the optimized route.'),
  totalDistance: z.string().describe('The total distance of the route.'),
  totalDuration: z.string().describe('The total duration of the route.'),
});
type GetOptimizedRouteToolOutput = z.infer<typeof RouteSchema>;

// Mock implementation. In a real app, this would call the Google Maps Directions API
// on the server to get the optimized waypoint order and calculate distance/duration.
const getOptimizedRoute = ai.defineTool(
  {
    name: 'getOptimizedRoute',
    description: 'Use when the user wants to get the most efficient route for the day\'s customers.',
    inputSchema: GetOptimizedRouteToolInputSchema,
    outputSchema: RouteSchema,
  },
  async ({ customers }) => {
    console.log('Tool: Optimizing route for customers', customers);
    // This is a mock response. A real implementation would need to use the
    // Google Maps Directions API to calculate the true optimal route.
    // The client-side already does this for display, but doing it on the
    // server would be necessary for more complex backend logic.
    return {
      stops: customers.map(c => ({ customerId: c.id, customerName: c.name, address: c.address })),
      totalDistance: "52 miles",
      totalDuration: "2 hours 15 minutes",
    };
  }
);


//
// Main Agent Flow
//

const AgentFlowInputSchema = z.object({
  command: z.string().describe('The natural language command from the user.'),
  customers: z.array(z.object({ // Providing customer list as context for the AI
    id: z.string(),
    name: z.string(),
    address: z.string(),
  })).describe('A list of existing customers to help the AI select the correct one.'),
});
export type AgentFlowInput = z.infer<typeof AgentFlowInputSchema>;


// Define the structure of what the agent can return
const AgentActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('add'),
    details: AddCustomerToolInputSchema,
  }),
  z.object({
    action: z.literal('select'),
    details: SelectCustomerToolInputSchema,
  }),
  z.object({
      action: z.literal('route'),
      details: RouteSchema,
  }),
  z.object({
    action: z.literal('none'),
    details: z.object({
      responseText: z.string().describe("The AI's response if no specific action is taken."),
    }),
  }),
]);


const AgentFlowOutputSchema = z.object({
  agentAction: AgentActionSchema,
});
export type AgentFlowOutput = z.infer<typeof AgentFlowOutputSchema>;


const agentPrompt = ai.definePrompt({
    name: 'agentPrompt',
    input: { schema: AgentFlowInputSchema },
    output: { schema: AgentFlowOutputSchema },
    tools: [addCustomerTool, selectCustomerTool, getOptimizedRoute],
    prompt: `You are a voice-enabled assistant for the LawnRoute application.
Your goal is to understand the user's command and use the available tools to perform actions.

Here is the user's command: {{{command}}}

Here is the list of existing customers:
{{#each customers}}
- ID: {{id}}, Name: {{name}}, Address: {{address}}
{{/each}}

Based on the command, decide which tool to use.
- If the user wants to add a customer, use the 'addCustomer' tool.
- If the user wants to see details for an existing customer, use the 'selectCustomer' tool. You must provide both the customerId and customerName.
- If the user wants to plan or optimize a route, use the 'getOptimizedRoute' tool.
- If the command is not a request to perform an action (e.g., a greeting or question), respond naturally without using a tool.

If you use a tool, wrap the result in the 'agentAction' output.
- For 'addCustomer', set the action to 'add' and populate the details.
- For 'selectCustomer', set the action to 'select' and populate the details.
- For 'getOptimizedRoute', set the action to 'route' and populate the details.
If you do not use a tool, set the action to 'none' and provide a 'responseText'.
`,
});

export async function agentFlow(input: AgentFlowInput): Promise<AgentFlowOutput> {
  const { output } = await agentPrompt(input, {
    // This logic maps the tool's output back to the structured response we want.
    // @ts-ignore - custom is not in type definitions but may be supported
    custom: {
      async addCustomer(input: AddCustomerToolInput) {
        return {
          agentAction: {
            action: 'add',
            details: input,
          }
        };
      },
      async selectCustomer(input: SelectCustomerToolInput) {
        return {
          agentAction: {
            action: 'select',
            details: input,
          }
        };
      },
      async getOptimizedRoute(route: GetOptimizedRouteToolOutput) {
          return {
              agentAction: {
                  action: 'route',
                  details: route,
              }
          };
      },
      async $noTool(input: any) {
        // If the LLM decides not to call a tool, we generate a text response.
        const llmResponse = await ai.generate({
          prompt: `You are a helpful assistant. The user said: "${input.command}". Please provide a brief, helpful response.`,
        });

        return {
          agentAction: {
            action: 'none',
            details: {
              responseText: llmResponse.text,
            },
          }
        };
      }
    }
  });
  return output!;
}
