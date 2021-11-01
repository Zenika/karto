import MultiKeyValueSelectControl from './MultiKeyValueSelectControl';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { configureMockForPopper } from '../utils/testutils';

describe('MultiKeyValueSelectControl component', () => {

    beforeAll(() => {
        configureMockForPopper();
    });


    it('creates an empty selection entry when none provided', () => {
        const operator = { op: 'eq', label: '', args: 'none' };
        const selectedOptions = [];
        const changeHandler = jest.fn();
        render(
            <MultiKeyValueSelectControl name={''} checked={false} keyPlaceholder={''} valuePlaceholder={''}
                                        options={{}} operators={[operator]}
                                        selectedOptions={selectedOptions} onChange={changeHandler}/>
        );

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith([{ key: null, operator: operator, value: null }]);
    });

    it('adds an empty selection entry below when add button is clicked', () => {
        const operator = { op: 'eq', label: '', args: 'none' };
        const previousSelectionEntry1 = { key: 'k1', operator: operator, value: 'v1' };
        const previousSelectionEntry2 = { key: 'k2', operator: operator, value: 'v2' };
        const emptySelectionEntry = { key: null, operator: operator, value: null };
        const selectedOptions = [previousSelectionEntry1, previousSelectionEntry2];
        const changeHandler = jest.fn();
        render(
            <MultiKeyValueSelectControl name={''} checked={false} keyPlaceholder={''} valuePlaceholder={''}
                                        options={{}} operators={[operator]}
                                        selectedOptions={selectedOptions} onChange={changeHandler}/>
        );

        fireEvent.click(screen.getAllByLabelText('add entry')[0]);

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith([previousSelectionEntry1, emptySelectionEntry,
            previousSelectionEntry2]);
    });

    it('removes the selection entry when remove button is clicked', () => {
        const operator = { op: 'eq', label: '', args: 'none' };
        const previousSelectionEntry1 = { key: 'k1', operator: operator, value: 'v1' };
        const previousSelectionEntry2 = { key: 'k2', operator: operator, value: 'v2' };
        const selectedOptions = [previousSelectionEntry1, previousSelectionEntry2];
        const changeHandler = jest.fn();
        render(
            <MultiKeyValueSelectControl name={''} checked={false} keyPlaceholder={''} valuePlaceholder={''}
                                        options={{}} operators={[operator]}
                                        selectedOptions={selectedOptions} onChange={changeHandler}/>
        );

        fireEvent.click(screen.getAllByLabelText('remove entry')[0]);

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith([previousSelectionEntry2]);
    });

    it('displays the key and operator for no-value operators', () => {
        const operator = { op: 'op-key', label: 'op-label', args: 'none' };
        const selectionEntry = { key: 'k1', operator: operator, value: null };
        const selectedOptions = [selectionEntry];
        const changeHandler = jest.fn();
        render(
            <MultiKeyValueSelectControl name={''} checked={false} keyPlaceholder={''} valuePlaceholder={''}
                                        options={{}} operators={[operator]}
                                        selectedOptions={selectedOptions} onChange={changeHandler}/>
        );

        expect(screen.queryByDisplayValue(selectionEntry.key)).toBeInTheDocument();
        expect(screen.queryByText(selectionEntry.operator.label)).toBeInTheDocument();
    });

    it('displays the key and operator and value for single-value operators', () => {
        const operator = { op: 'op-key', label: 'op-label', args: 'single' };
        const selectionEntry = { key: 'k1', operator: operator, value: 'v1' };
        const selectedOptions = [selectionEntry];
        const changeHandler = jest.fn();
        render(
            <MultiKeyValueSelectControl name={''} checked={false} keyPlaceholder={''} valuePlaceholder={''}
                                        options={{}} operators={[operator]}
                                        selectedOptions={selectedOptions} onChange={changeHandler}/>
        );

        expect(screen.queryByDisplayValue(selectionEntry.key)).toBeInTheDocument();
        expect(screen.queryByText(selectionEntry.operator.label)).toBeInTheDocument();
        expect(screen.queryByDisplayValue(selectionEntry.value)).toBeInTheDocument();
    });

    it('displays the key and operator and value for multiple-value operators', () => {
        const operator = { op: 'op-key', label: 'op-label', args: 'multiple' };
        const selectionEntry = { key: 'k1', operator: operator, value: ['v1', 'v2'] };
        const selectedOptions = [selectionEntry];
        const changeHandler = jest.fn();
        render(
            <MultiKeyValueSelectControl name={''} checked={false} keyPlaceholder={''} valuePlaceholder={''}
                                        options={{}} operators={[operator]}
                                        selectedOptions={selectedOptions} onChange={changeHandler}/>
        );

        expect(screen.queryByDisplayValue(selectionEntry.key)).toBeInTheDocument();
        expect(screen.queryByText(selectionEntry.operator.label)).toBeInTheDocument();
        expect(screen.queryByText(selectionEntry.value[0])).toBeInTheDocument();
        expect(screen.queryByText(selectionEntry.value[1])).toBeInTheDocument();
    });

    it('calls change handler with same operator and default value when key changes', () => {
        const keyPlaceholder = 'keyPlaceholder';
        const valuePlaceholder = 'valuePlaceholder';
        const operator = { op: 'eq', label: '', args: 'single' };
        const previousSelectionEntry = { key: 'k1', operator: operator, value: 'k1-1' };
        const options = {
            k1: ['k1-1', 'k1-2'],
            k2: ['k2-1', 'k2-2']
        };
        const selectedOptions = [previousSelectionEntry];
        const changeHandler = jest.fn();
        render(
            <MultiKeyValueSelectControl name={''} checked={false} keyPlaceholder={keyPlaceholder}
                                        valuePlaceholder={valuePlaceholder} options={options} operators={[operator]}
                                        selectedOptions={selectedOptions} onChange={changeHandler}/>
        );

        const input = screen.getByPlaceholderText(keyPlaceholder);
        fireEvent.change(input, { target: { value: 'k2' } });
        fireEvent.click(screen.getByText('k2'));

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith([
            { key: 'k2', operator: previousSelectionEntry.operator, value: null }
        ]);
    });

    it('calls change handler with same key and same value when operator changes to one with same args', () => {
        const operator1 = { op: 'eq', label: 'eq', args: 'single' };
        const operator2 = { op: 'neq', label: 'neq', args: 'single' };
        const previousSelectionEntry = { key: 'k1', operator: operator1, value: 'k1-1' };
        const options = {
            k1: ['k1-1', 'k1-2'],
            k2: ['k2-1', 'k2-2']
        };
        const selectedOptions = [previousSelectionEntry];
        const changeHandler = jest.fn();
        render(
            <MultiKeyValueSelectControl name={''} checked={false} keyPlaceholder={''} valuePlaceholder={''}
                                        options={options} operators={[operator1, operator2]}
                                        selectedOptions={selectedOptions} onChange={changeHandler}/>
        );

        fireEvent.mouseDown(screen.getByText(operator1.label));
        fireEvent.click(screen.getByText(operator2.label));

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith([
            { key: previousSelectionEntry.key, operator: operator2, value: previousSelectionEntry.value }
        ]);
    });

    it('calls change handler with same key and default value when operator changes to one with other args', () => {
        const operator1 = { op: 'eq', label: 'eq', args: 'single' };
        const operator2 = { op: 'neq', label: 'neq', args: 'multiple' };
        const previousSelectionEntry = { key: 'k1', operator: operator1, value: 'k1-1' };
        const options = {
            k1: ['k1-1', 'k1-2'],
            k2: ['k2-1', 'k2-2']
        };
        const selectedOptions = [previousSelectionEntry];
        const changeHandler = jest.fn();
        render(
            <MultiKeyValueSelectControl name={''} checked={false} keyPlaceholder={''} valuePlaceholder={''}
                                        options={options} operators={[operator1, operator2]}
                                        selectedOptions={selectedOptions} onChange={changeHandler}/>
        );

        fireEvent.mouseDown(screen.getByText(operator1.label));
        fireEvent.click(screen.getByText(operator2.label));

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith([
            { key: previousSelectionEntry.key, operator: operator2, value: [] }
        ]);
    });

    it('calls change handler when value changes', () => {
        const keyPlaceholder = 'keyPlaceholder';
        const valuePlaceholder = 'valuePlaceholder';
        const operator1 = { op: 'eq', label: 'eq', args: 'single' };
        const previousValue = 'k1-1';
        const newValue = 'k1-2';
        const previousSelectionEntry = { key: 'k1', operator: operator1, value: previousValue };
        const options = { k1: [previousValue, newValue] };
        const selectedOptions = [previousSelectionEntry];
        const changeHandler = jest.fn();
        render(
            <MultiKeyValueSelectControl name={''} checked={false} keyPlaceholder={keyPlaceholder}
                                        valuePlaceholder={valuePlaceholder} options={options} operators={[operator1]}
                                        selectedOptions={selectedOptions} onChange={changeHandler}/>
        );

        const input = screen.getByPlaceholderText(valuePlaceholder);
        fireEvent.change(input, { target: { value: newValue } });
        fireEvent.click(screen.getByText(newValue));

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith([
            { key: previousSelectionEntry.key, operator: previousSelectionEntry.operator, value: newValue }
        ]);
    });

    it('clears input when clear button is clicked', () => {
        const operator = { op: 'eq', label: 'eq', args: 'single' };
        const previousSelectionEntry1 = { key: 'k1', operator: operator, value: 'v1' };
        const previousSelectionEntry2 = { key: 'k2', operator: operator, value: 'v2' };
        const options = { k1: ['v1'], k2: ['v2'] };
        const selectedOptions = [previousSelectionEntry1, previousSelectionEntry2];
        const changeHandler = jest.fn();
        render(
            <MultiKeyValueSelectControl name={''} checked={false} keyPlaceholder={''}
                                        valuePlaceholder={''} options={options} operators={[operator]}
                                        selectedOptions={selectedOptions} onChange={changeHandler}/>
        );

        fireEvent.click(screen.getByText('Clear'));

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith([]);
    });
});
